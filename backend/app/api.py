from __future__ import annotations
import numpy as np # type: ignore
import joblib  # type: ignore
from pathlib import Path
from fastapi import FastAPI # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from pydantic import BaseModel # type: ignore
from .rasengan_detector import RasenganDetector
from .features import extract_features, palm_open, CONF_THRESHOLD, CLASS_THRESHOLDS


BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PKL = BASE_DIR / "hand_sign_model.pkl"
model = joblib.load(str(MODEL_PKL))
rasengan_detector = RasenganDetector()
app = FastAPI(title="Naruto Sign API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Landmark(BaseModel):
    x: float
    y: float
    z: float

class PredictRequest(BaseModel):
    hands: list[list[Landmark]]

class PredictResponse(BaseModel):
    sign: str
    confidence: float
    method: str
    hands: int
    jutsu: str | None = None
    chakra_state: str | None = None

@app.post("/api/predict/landmarks", response_model=PredictResponse)
async def predict_landmarks(req: PredictRequest) -> PredictResponse:
    n_hands = len(req.hands)
    left_hand = None
    right_hand = None
    if n_hands >= 1 and len(req.hands[0]) == 21:
        left_hand = req.hands[0]
    if n_hands >= 2 and len(req.hands[1]) == 21:
        right_hand = req.hands[1]
    left_features = [0.0] * 80
    right_features = [0.0] * 80
    if left_hand is not None:
        left_features = extract_features(left_hand)
    if right_hand is not None:
        right_features = extract_features(right_hand)
    combined = left_features + right_features
    if left_hand is not None and right_hand is not None:
        lw = np.array([left_hand[0].x, left_hand[0].y, left_hand[0].z])
        rw = np.array([right_hand[0].x, right_hand[0].y, right_hand[0].z])
        wrist_dist = float(np.linalg.norm(lw - rw))
    else:
        wrist_dist = 0.0
    combined.append(wrist_dist)
    probs = model.predict_proba([combined])[0]
    best_idx = int(np.argmax(probs))
    prediction = str(model.classes_[best_idx])
    confidence = float(probs[best_idx])
    if left_hand is None or right_hand is None:
        rasengan_detector.reset()
    chakra_state = rasengan_detector.update(left_hand, right_hand)

    # Rasengan activation: CHAKRA_READY + open palm → rasengan fires
    if chakra_state == "CHAKRA_READY":
        has_open_palm = (
            (right_hand is not None and palm_open(right_hand)) or
            (left_hand is not None and palm_open(left_hand))
        )
        if has_open_palm:
            rasengan_detector.reset()
            return PredictResponse(
                sign="rasengan", confidence=1.0, method="rule",
                hands=n_hands, jutsu="rasengan", chakra_state="RASENGAN"
            )
        # Stay in CHAKRA_READY — don't reset, wait for palm
        return PredictResponse(
            sign=prediction, confidence=confidence,
            method="model", hands=n_hands, jutsu=None,
            chakra_state="CHAKRA_READY"
        )

    jutsu = None
    if prediction == "shadow" and confidence > 0.85:
        jutsu = "shadow_clone"

    # Per-class confidence gating (not applied to rule-based rasengan)
    if prediction != "rasengan":
        required = CLASS_THRESHOLDS.get(prediction, CONF_THRESHOLD)
        if confidence < required:
            prediction = "neutral"

    return PredictResponse(
        sign=prediction, confidence=confidence,
        method="model", hands=n_hands, jutsu=jutsu,
        chakra_state=chakra_state if chakra_state != "IDLE" else None
    )

@app.get("/api/health")
async def health():
    return {"status": "ok", "model_classes": list(model.classes_)}
