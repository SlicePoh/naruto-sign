import cv2
import mediapipe as mp
import time
import csv
import numpy as np
from pathlib import Path
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

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

cap = cv2.VideoCapture(0)
if not cap.isOpened():
    raise RuntimeError("Cannot open webcam")

HAND_CONNECTIONS = [
    (0,1),(1,2),(2,3),(3,4),
    (0,5),(5,6),(6,7),(7,8),
    (0,9),(9,10),(10,11),(11,12),
    (0,13),(13,14),(14,15),(15,16),
    (0,17),(17,18),(18,19),(19,20)
]

def extract_features(hand_landmarks):
    wrist = hand_landmarks[0]
    features = []
    for lm in hand_landmarks:
        features.extend([
            lm.x - wrist.x,
            lm.y - wrist.y,
            lm.z - wrist.z
        ])
    return features

def draw_hand(hand_landmarks, frame):
    points = []
    h, w, _ = frame.shape
    for lm in hand_landmarks:
        x = int(lm.x * w)
        y = int(lm.y * h)
        points.append((x, y))
        cv2.circle(frame, (x, y), 4, (0, 255, 0), -1)
    for start, end in HAND_CONNECTIONS:
        cv2.line(frame, points[start], points[end], (255, 0, 0), 2)

label = "neutral"
record = False

file = open("dataset.csv", mode="a", newline="")
writer = csv.writer(file)

start_time = time.time()

while True:
    ret, frame = cap.read()
    if not ret:
        break

    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(
        image_format=mp.ImageFormat.SRGB,
        data=rgb_frame
    )

    timestamp_ms = int((time.time() - start_time) * 1000)
    result = detector.detect_for_video(mp_image, timestamp_ms)

    left_hand = None
    right_hand = None

    if result.hand_landmarks and result.handedness:
        for idx, handedness in enumerate(result.handedness):
            label_name = handedness[0].category_name
            if label_name == "Left":
                left_hand = result.hand_landmarks[idx]
            else:
                right_hand = result.hand_landmarks[idx]

    left_features = [0.0] * 63
    right_features = [0.0] * 63

    if left_hand:
        draw_hand(left_hand, frame)
        left_features = extract_features(left_hand)

    if right_hand:
        draw_hand(right_hand, frame)
        right_features = extract_features(right_hand)

    combined_features = left_features + right_features

    if record:
        writer.writerow(combined_features + [label])

    status_text = f"Recording: {record} for {label} sign"
    cv2.putText(frame, status_text, (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX,
                1, (0, 255, 255), 2)

    cv2.imshow("Hand Tracking - Video", frame)

    key = cv2.waitKey(1) & 0xFF

    if key == ord('r'):
        record = not record

    if key == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
file.close()