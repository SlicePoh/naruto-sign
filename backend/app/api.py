"""
FastAPI backend for Naruto hand-sign prediction.

Receives hand-landmark arrays from the browser (via MediaPipe Hands JS),
extracts the same features used during training, and returns the
predicted sign + confidence from the Random-Forest model.
"""

from __future__ import annotations

import numpy as np
import joblib  # type: ignore
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── paths ────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PKL = BASE_DIR / "hand_sign_model.pkl"

# ── load model once at startup ───────────────────────────────────────
model = joblib.load(str(MODEL_PKL))

# ── FastAPI app ──────────────────────────────────────────────────────
app = FastAPI(title="Naruto Sign API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── request / response schemas ───────────────────────────────────────
class Landmark(BaseModel):
    x: float
    y: float
    z: float


class PredictRequest(BaseModel):
    hands: list[list[Landmark]]  # 0-2 hands, each with 21 landmarks


class PredictResponse(BaseModel):
    sign: str
    confidence: float
    method: str  # "model" or "rule"
    hands: int
    jutsu: str | None = None  # e.g. "shadow_clone" for special cases


# ── feature extraction (mirrors training_model / main.py) ───────────
def _extract_features(hand_landmarks: list[Landmark]) -> list[float]:
    """80-dim feature vector for one hand — same logic as main.py."""
    coords = [np.array([lm.x, lm.y, lm.z]) for lm in hand_landmarks]
    wrist = coords[0]
    middle_mcp = coords[9]
    hand_size = float(np.linalg.norm(middle_mcp - wrist)) + 1e-6

    features: list[float] = []

    # 1) normalized relative deltas (21 × 3 = 63)
    for point in coords:
        delta = (point - wrist) / hand_size
        features.extend(delta.tolist())

    # 2) joint angles (10)
    finger_triplets = [
        (1, 2, 3), (2, 3, 4),
        (5, 6, 7), (6, 7, 8),
        (9, 10, 11), (10, 11, 12),
        (13, 14, 15), (14, 15, 16),
        (17, 18, 19), (18, 19, 20),
    ]
    for a, b, c in finger_triplets:
        ba = coords[a] - coords[b]
        bc = coords[c] - coords[b]
        cos_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
        angle = float(np.degrees(np.arccos(np.clip(cos_angle, -1.0, 1.0)))) / 180.0
        features.append(angle)

    # 3) fingertip distances (4)
    tip_pairs = [(4, 8), (8, 12), (12, 16), (16, 20)]
    for a, b in tip_pairs:
        dist = float(np.linalg.norm(coords[a] - coords[b])) / hand_size
        features.append(dist)

    # 4) palm normal vector (3)
    v1 = coords[9] - wrist
    v2 = coords[17] - wrist
    normal = np.cross(v1, v2)
    normal = normal / (np.linalg.norm(normal) + 1e-6)
    features.extend(normal.tolist())

    return features  # 80


# ── prediction endpoint ─────────────────────────────────────────────
CONF_THRESHOLD = 0.60  # lower than CV2 loop since we debounce on the frontend


@app.post("/api/predict/landmarks", response_model=PredictResponse)
async def predict_landmarks(req: PredictRequest) -> PredictResponse:
    n_hands = len(req.hands)

    # Build left/right feature vectors (zero-pad missing hands)
    left_features = [0.0] * 80
    right_features = [0.0] * 80

    # MediaPipe JS reports hands in detection order; we use index 0/1
    # (the browser doesn't give us handedness easily, so we treat
    #  first hand = left, second hand = right — matches training)
    if n_hands >= 1 and len(req.hands[0]) == 21:
        left_features = _extract_features(req.hands[0])
    if n_hands >= 2 and len(req.hands[1]) == 21:
        right_features = _extract_features(req.hands[1])

    combined = left_features + right_features  # 160

    # wrist-to-wrist distance (feature 161)
    if n_hands >= 2 and len(req.hands[0]) == 21 and len(req.hands[1]) == 21:
        lw = np.array([req.hands[0][0].x, req.hands[0][0].y, req.hands[0][0].z])
        rw = np.array([req.hands[1][0].x, req.hands[1][0].y, req.hands[1][0].z])
        wrist_dist = float(np.linalg.norm(lw - rw))
    else:
        wrist_dist = 0.0

    combined.append(wrist_dist)  # 161 total

    # predict
    probs = model.predict_proba([combined])[0]
    best_idx = int(np.argmax(probs))
    prediction = str(model.classes_[best_idx])
    confidence = float(probs[best_idx])

    if prediction == "shadow" and confidence > 0.85:
        jutsu = "shadow_clone"
    else:
        jutsu = None

    if confidence < CONF_THRESHOLD:
        prediction = "neutral"
        

    return PredictResponse(
        sign=prediction,
        confidence=confidence,
        method="model",
        hands=n_hands,
        jutsu=jutsu
    )


@app.get("/api/health")
async def health():
    return {"status": "ok", "model_classes": list(model.classes_)}
