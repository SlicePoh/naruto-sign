import cv2
import mediapipe as mp
import time
import csv
import numpy as np
import joblib #type: ignore
from pathlib import Path
from collections import deque
from mediapipe.tasks import python
from mediapipe.tasks.python import vision


# MODEL + MEDIAPIPE SETUP
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "app" / "models" / "hand_landmarker.task"
base_options = python.BaseOptions(model_asset_path=str(MODEL_PATH))
options = vision.HandLandmarkerOptions(
    base_options=base_options,
    num_hands=2,
    running_mode=vision.RunningMode.VIDEO,
    min_hand_detection_confidence=0.4,
    min_hand_presence_confidence=0.4,
    min_tracking_confidence=0.4
)
detector = vision.HandLandmarker.create_from_options(options)
model = joblib.load("hand_sign_model.pkl")

# CAMERA
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    raise RuntimeError("Cannot open webcam")

# HAND DRAWING CONNECTIONS
HAND_CONNECTIONS = [ (0,1),(1,2),(2,3),(3,4),
    (0,5),(5,6),(6,7),(7,8),
    (0,9),(9,10),(10,11),(11,12),
    (0,13),(13,14),(14,15),(15,16),
    (0,17),(17,18),(18,19),(19,20)
]

# FEATURE EXTRACTION
def extract_features(hand_landmarks):
    coords = []
    for lm in hand_landmarks:
        coords.append(np.array([lm.x, lm.y, lm.z]))
    wrist = coords[0]
    middle_mcp = coords[9]
    # scale normalization
    hand_size = np.linalg.norm(middle_mcp - wrist) + 1e-6
    features = []
    # 1) normalized relative deltas (63)
    for point in coords:
        delta = (point - wrist) / hand_size
        features.extend(delta.tolist())
    # 2) joint angles (10)
    finger_triplets = [ (1,2,3),(2,3,4),
        (5,6,7),(6,7,8),
        (9,10,11),(10,11,12),
        (13,14,15),(14,15,16),
        (17,18,19),(18,19,20)
    ]
    for a,b,c in finger_triplets:
        ba = coords[a] - coords[b]
        bc = coords[c] - coords[b]
        cos_angle = np.dot(ba, bc) / (
            (np.linalg.norm(ba) * np.linalg.norm(bc)) + 1e-6
        )
        angle = np.degrees(
            np.arccos(np.clip(cos_angle, -1.0, 1.0))
        ) / 180.0
        features.append(angle)
    # 3) fingertip distances (4)
    tip_pairs = [(4,8),(8,12),(12,16),(16,20)]
    for a,b in tip_pairs:
        dist = np.linalg.norm(coords[a] - coords[b]) / hand_size
        features.append(dist)
    # 4) palm normal vector (3)
    v1 = coords[9] - wrist
    v2 = coords[17] - wrist
    normal = np.cross(v1, v2)
    normal = normal / (np.linalg.norm(normal) + 1e-6)
    features.extend(normal.tolist())
    return features  # total = 80

# DRAW FUNCTION
def draw_hand(hand_landmarks, frame):
    points = []
    h, w, _ = frame.shape
    for lm in hand_landmarks:
        x = int(lm.x * w)
        y = int(lm.y * h)
        points.append((x, y))
        cv2.circle(frame, (x, y), 4, (0,255,0), -1)
    for start, end in HAND_CONNECTIONS:
        cv2.line(frame, points[start], points[end], (255,0,0), 2)

# RECORDING + SMOOTHING
label = "tiger"
record = False
file = open("dataset.csv", mode="a", newline="")
writer = csv.writer(file)
pred_buffer = deque(maxlen=15)
CONF_THRESHOLD = 0.82
start_time = time.time()

# MAIN LOOP
while True:
    ret, frame = cap.read()
    if not ret:
        break
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
    timestamp_ms = int((time.time() - start_time) * 1000)
    result = detector.detect_for_video(mp_image, timestamp_ms)
    left_hand = None
    right_hand = None
    if result.hand_landmarks and result.handedness:
        for idx, handedness in enumerate(result.handedness):
            if handedness[0].category_name == "Left":
                left_hand = result.hand_landmarks[idx]
            else:
                right_hand = result.hand_landmarks[idx]
    # zero padding (80 per hand)
    left_features = [0.0] * 80
    right_features = [0.0] * 80
    if left_hand:
        draw_hand(left_hand, frame)
        left_features = extract_features(left_hand)
    if right_hand:
        draw_hand(right_hand, frame)
        right_features = extract_features(right_hand)
    combined_features = left_features + right_features  # 160

    # wrist-to-wrist distance (scale normalized)
    if left_hand and right_hand:
        lw = np.array([left_hand[0].x, left_hand[0].y, left_hand[0].z])
        rw = np.array([right_hand[0].x, right_hand[0].y, right_hand[0].z])
        dist = np.linalg.norm(lw - rw)
    else:
        dist = 0.0
    combined_features.append(dist)  # total = 161
    # record dataset
    if record:
        writer.writerow(combined_features + [label])
    # PREDICTION + THRESHOLD GATING
    probs = model.predict_proba([combined_features])[0]
    best_idx = np.argmax(probs)
    prediction = model.classes_[best_idx]
    confidence = probs[best_idx]
    if confidence < CONF_THRESHOLD:
        prediction = "unknown"
    pred_buffer.append(prediction)
    if len(pred_buffer) > 0:
        final_pred = max(set(pred_buffer), key=pred_buffer.count)
    else:
        final_pred = "unknown"
        
    # UI DISPLAY
    cv2.putText(
        frame,
        f"Sign: {final_pred} ({confidence:.2f})",
        (20, 80),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (0,255,0),
        2
    )

    cv2.putText(
        frame,
        f"Recording: {record} for {label}",
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (0,255,255),
        2
    )

    cv2.imshow("Hand Tracking - Video", frame)

    key = cv2.waitKey(1) & 0xFF

    if key == ord('r'):
        record = not record
    if key == ord('1'):
        label = "ram"
    if key == ord('2'):
        label = "tiger"
    if key == ord('3'):
        label = "horse"
    if key == ord('4'):
        label = "serpent"
    if key == ord('5'):
        label = "dog"
    if key == ord('0'):
        label = "neutral"
    if key == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
file.close()