from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

import numpy as np

from .schemas import PredictLandmarksRequest, SignLabel


@dataclass(frozen=True)
class Prediction:
    sign: SignLabel
    confidence: float
    method: str


def _distance3d(a: np.ndarray, b: np.ndarray) -> float:
    d = a - b
    return float(np.sqrt(np.dot(d, d)))


def _clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def _finger_extension(hand: np.ndarray, base_idx: int, tip_idx: int, palm_width: float) -> float:
    dist = _distance3d(hand[base_idx], hand[tip_idx])
    normalized = dist / max(palm_width, 1e-6)
    # Match frontend: >0.6 extended, <0.4 bent
    return _clamp((normalized - 0.4) / 0.2, 0.0, 1.0)


def _extract_features(hand: np.ndarray) -> dict:
    palm_width = _distance3d(hand[0], hand[9])
    finger_ext = [
        _finger_extension(hand, 1, 4, palm_width),
        _finger_extension(hand, 5, 8, palm_width),
        _finger_extension(hand, 9, 12, palm_width),
        _finger_extension(hand, 13, 16, palm_width),
        _finger_extension(hand, 17, 20, palm_width),
    ]
    return {"fingerExtensions": finger_ext}


def _classify_rule(features: dict) -> SignLabel:
    thumb, index, middle, ring, pinky = features["fingerExtensions"]

    thumb_extended = thumb > 0.6

    all_in_transition = all(0.3 < f < 0.6 for f in (thumb, index, middle, ring, pinky))
    if all_in_transition:
        return "unknown"

    no_definite_positions = all(0.35 < f < 0.65 for f in (index, middle, ring, pinky))
    if no_definite_positions and 0.35 < thumb < 0.65:
        return "unknown"

    finger_variance = max(index, middle, ring, pinky) - min(index, middle, ring, pinky)
    if finger_variance < 0.2:
        return "unknown"

    # Tiger
    if index > 0.65 and middle > 0.5 and ring < 0.35 and pinky < 0.35:
        clear_separation = (index - ring) > 0.3 and (middle - pinky) > 0.3
        if clear_separation:
            return "tiger"

    # Ram
    if index > 0.7 and 0.4 < middle < 0.7 and (ring < 0.5 or pinky < 0.5):
        different_from_tiger = ring < 0.3 or pinky < 0.3 or middle < 0.6
        if different_from_tiger:
            return "ram"

    # Snake (single-hand heuristic)
    all_fingers_moderate = (
        0.5 < index < 0.8
        and 0.5 < middle < 0.8
        and 0.5 < ring < 0.8
        and 0.5 < pinky < 0.8
    )
    thumb_moderate = 0.4 < thumb < 0.75
    finger_uniformity = max(index, middle, ring, pinky) - min(index, middle, ring, pinky)
    is_uniform = finger_uniformity < 0.3
    if all_fingers_moderate and thumb_moderate and is_uniform:
        return "snake"

    # Bird
    if index > 0.7 and middle > 0.7 and ring > 0.7 and pinky > 0.7 and thumb_extended:
        if index > 0.75 and middle > 0.75 and ring > 0.75 and pinky > 0.75:
            return "bird"

    # Boar
    if index < 0.3 and middle < 0.3 and ring < 0.3 and pinky < 0.3 and thumb < 0.3:
        if index < 0.25 and middle < 0.25 and ring < 0.25 and pinky < 0.25:
            return "boar"

    # Ox
    if thumb_extended and index > 0.7 and middle < 0.35 and ring < 0.35 and pinky < 0.35:
        if middle < 0.4:
            return "ox"

    # Dragon
    if thumb_extended and index > 0.7 and middle > 0.7 and ring < 0.35 and pinky < 0.35:
        if ring < 0.4 and pinky < 0.4:
            return "dragon"

    return "unknown"


def _maybe_load_model():
    model_path = os.getenv("MODEL_PATH", "").strip()
    if not model_path:
        return None
    try:
        import joblib  # type: ignore

        return joblib.load(model_path)
    except Exception:
        return None


_MODEL = _maybe_load_model()


def predict(request: PredictLandmarksRequest) -> Prediction:
    # Prefer first hand for now; you can extend this to two-hand model later.
    if not request.hands:
        return Prediction(sign="unknown", confidence=0.0, method="rule")

    first = request.hands[0]
    if len(first) != 21:
        return Prediction(sign="unknown", confidence=0.0, method="rule")

    hand = np.array([[lm.x, lm.y, lm.z] for lm in first], dtype=np.float32)

    if _MODEL is not None:
        # Expected: model returns (label, confidence) or predict_proba style.
        try:
            if hasattr(_MODEL, "predict_proba"):
                proba = _MODEL.predict_proba(hand.reshape(1, -1))[0]
                classes = getattr(_MODEL, "classes_", None)
                if classes is not None:
                    idx = int(np.argmax(proba))
                    label = str(classes[idx])
                    conf = float(proba[idx])
                    return Prediction(sign=label, confidence=conf, method="model")
            label = str(_MODEL.predict(hand.reshape(1, -1))[0])
            return Prediction(sign=label, confidence=0.5, method="model")
        except Exception:
            pass

    features = _extract_features(hand)
    label = _classify_rule(features)
    conf = 1.0 if label != "unknown" else 0.0
    return Prediction(sign=label, confidence=conf, method="rule")
