import cv2  # type: ignore
import mediapipe as mp  # type: ignore
import time
import csv
import numpy as np  # type: ignore
import joblib
from pathlib import Path
from collections import deque
from mediapipe.tasks import python  # type: ignore
from mediapipe.tasks.python import vision  # type: ignore
from rasengan_detector import RasenganDetector
from features import extract_features, palm_open, CONF_THRESHOLD, CLASS_THRESHOLDS

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "app" / "models" / "hand_landmarker.task"

base_options = python.BaseOptions(model_asset_path=str(MODEL_PATH))
options = vision.HandLandmarkerOptions( base_options=base_options, num_hands=2,
    running_mode=vision.RunningMode.VIDEO, min_hand_detection_confidence=0.4,
    min_hand_presence_confidence=0.4, min_tracking_confidence=0.4
)
detector = vision.HandLandmarker.create_from_options(options)
MODEL_PKL = Path("hand_sign_model.pkl")
if MODEL_PKL.exists():
    model = joblib.load(str(MODEL_PKL))
    print("Model loaded.")
else:
    model = None
    print("No model found — recording mode only.")
rasengan_detector = RasenganDetector()
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    raise RuntimeError("Cannot open webcam")
HAND_CONNECTIONS = [(0,1),(1,2),(2,3),(3,4), (0,5),(5,6),(6,7),(7,8), (0,9),(9,10),(10,11),(11,12),
        (0,13),(13,14),(14,15),(15,16),(0,17),(17,18),(18,19),(19,20)]
SIGN_COLORS = {
    "ram": (255, 140, 0), "tiger": (0, 215, 255), "horse": (255, 105, 180), "serpent": (50, 205, 50),
    "dog": (255, 99, 71), "rasengan": (147, 20, 255), "hare": (255, 200, 100),
    "rat": (200, 200, 0), "shadow": (180, 0, 255), "bird": (100, 255, 255), "boar": (255, 150, 150),
    "ox": (150, 150, 255), "dragon": (0, 165, 255), "monkey": (0, 200, 150),
}



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

def get_hand_sign_box(frame, hands, padding=18):
    valid_hands = [hand for hand in hands if hand is not None]
    if not valid_hands:
        return None
    h, w, _ = frame.shape
    x_coords = []
    y_coords = []
    for hand_landmarks in valid_hands:
        for landmark in hand_landmarks:
            x_coords.append(int(landmark.x * w))
            y_coords.append(int(landmark.y * h))
    x_min = max(min(x_coords) - padding, 0)
    y_min = max(min(y_coords) - padding, 0)
    x_max = min(max(x_coords) + padding, w - 1)
    y_max = min(max(y_coords) + padding, h - 1)
    return x_min, y_min, x_max, y_max


def draw_sign_box(frame, hands, sign_name):
    if sign_name not in SIGN_COLORS:
        return
    box = get_hand_sign_box(frame, hands)
    if box is None:
        return
    x_min, y_min, x_max, y_max = box
    color = SIGN_COLORS[sign_name]
    cv2.rectangle(frame, (x_min, y_min), (x_max, y_max), color, 2)
    label = sign_name.upper()
    (text_w, text_h), baseline = cv2.getTextSize(
        label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2
    )
    label_x = x_min
    label_y = max(y_min - 12, text_h + baseline + 8)
    bg_top = label_y - text_h - baseline - 6
    bg_bottom = label_y + baseline + 4
    bg_right = min(label_x + text_w + 12, frame.shape[1] - 1)
    cv2.rectangle( frame, (label_x, bg_top), (bg_right, bg_bottom), color, -1, )
    cv2.putText( frame, label, (label_x + 6, label_y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2, )

label = "neutral"
record = False
file = open("dataset.csv", mode="a", newline="")
writer = csv.writer(file)
pred_buffer = deque(maxlen=15)

# Key-to-label mapping for recording
KEY_LABELS = {
    ord('0'): 'neutral',
    ord('1'): 'ram',
    ord('2'): 'tiger',
    ord('3'): 'horse',
    ord('4'): 'serpent',
    ord('5'): 'dog',
    ord('6'): 'hare',
    ord('7'): 'rat',
    ord('8'): 'shadow',
    ord('9'): 'bird',
    ord('a'): 'boar',
    ord('b'): 'ox',
    ord('c'): 'dragon',
    ord('d'): 'monkey',
}
start_time = time.time()
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
    left_features = [0.0] * 80
    right_features = [0.0] * 80
    if left_hand:
        draw_hand(left_hand, frame)
        left_features = extract_features(left_hand)
    if right_hand:
        draw_hand(right_hand, frame)
        right_features = extract_features(right_hand)
    combined_features = left_features + right_features
    if left_hand and right_hand:
        lw = np.array([left_hand[0].x, left_hand[0].y, left_hand[0].z])
        rw = np.array([right_hand[0].x, right_hand[0].y, right_hand[0].z])
        dist = np.linalg.norm(lw - rw)
    else:
        dist = 0.0
    combined_features.append(dist)
    if record:
        writer.writerow(combined_features + [label])
    prediction = "unknown"
    confidence = 0.0
    if model is not None:
        probs = model.predict_proba([combined_features])[0]
        best_idx = np.argmax(probs)
        prediction = model.classes_[best_idx]
        confidence = probs[best_idx]
        # Per-class confidence gating (not applied to rule-based rasengan)
        if prediction != "rasengan":
            required = CLASS_THRESHOLDS.get(prediction, CONF_THRESHOLD)
            if confidence < required:
                prediction = "unknown"
    chakra_state = rasengan_detector.update(left_hand, right_hand)
    if chakra_state == "CHAKRA_READY":
        cv2.putText( frame, "CHAKRA READY", (20, 120), cv2.FONT_HERSHEY_SIMPLEX, 1,
            (255,200,0), 3 )
        if right_hand is not None and palm_open(right_hand):
            prediction = "rasengan"
            confidence = 1.0
            rasengan_detector.reset()
    elif chakra_state != "IDLE":
        cv2.putText( frame, f"Chakra: {chakra_state}", (20, 120), cv2.FONT_HERSHEY_SIMPLEX, 1,
            (0,200,255), 2 )
    pred_buffer.append(prediction)
    if len(pred_buffer) > 0:
        final_pred = max(set(pred_buffer), key=pred_buffer.count)
    else:
        final_pred = "unknown"
    draw_sign_box(frame, [left_hand, right_hand], final_pred)
    cv2.putText( frame, f"Sign: {final_pred} ({confidence:.2f})", (20, 80), 
            cv2.FONT_HERSHEY_SIMPLEX, 1, (0,255,0), 2 )

    cv2.putText( frame, f"Recording: {record} for {label}", (20, 40), 
            cv2.FONT_HERSHEY_SIMPLEX, 1, (0,255,255), 2 )

    # On-screen key legend
    legend_y = frame.shape[0] - 20
    legend = "0:neutral 1:ram 2:tiger 3:horse 4:serpent 5:dog 6:hare 7:rat 8:shadow 9:bird a:boar b:ox c:dragon d:monkey"
    cv2.putText(frame, legend, (10, legend_y), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (180,180,180), 1)

    cv2.imshow("Hand Tracking - Video", frame)
    key = cv2.waitKey(1) & 0xFF
    if key == ord('r'):
        record = not record
    if key in KEY_LABELS:
        label = KEY_LABELS[key]
    if key == ord('q'):
        break
cap.release()
cv2.destroyAllWindows()
file.close()
