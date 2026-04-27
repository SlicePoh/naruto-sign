"""Shared feature-extraction and hand-geometry helpers.

Used by both the FastAPI inference server (api.py) and the local
OpenCV demo (main.py) so the logic stays in one place.
"""

from __future__ import annotations

import numpy as np  # type: ignore


# ── Confidence thresholds (shared across api.py / main.py) ──────────
CONF_THRESHOLD = 0.78

CLASS_THRESHOLDS: dict[str, float] = {
    "tiger":   0.90,
    "shadow":  0.88,
    "neutral": 0.50,
}


def extract_features(hand_landmarks) -> list[float]:
    """Return an 80-element feature vector for a single hand.

    Works with any landmark object that exposes `.x`, `.y`, `.z`
    (MediaPipe NormalizedLandmark *or* Pydantic Landmark model).
    """
    coords = [np.array([lm.x, lm.y, lm.z]) for lm in hand_landmarks]
    wrist = coords[0]
    middle_mcp = coords[9]
    hand_size = float(np.linalg.norm(middle_mcp - wrist)) + 1e-6

    features: list[float] = []
    for point in coords:
        delta = (point - wrist) / hand_size
        features.extend(delta.tolist())

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

    tip_pairs = [(4, 8), (8, 12), (12, 16), (16, 20)]
    for a, b in tip_pairs:
        dist = float(np.linalg.norm(coords[a] - coords[b])) / hand_size
        features.append(dist)

    v1 = coords[9] - wrist
    v2 = coords[17] - wrist
    normal = np.cross(v1, v2)
    normal = normal / (np.linalg.norm(normal) + 1e-6)
    features.extend(normal.tolist())

    return features


def palm_open(hand) -> bool:
    """Return True when at least 3 of 4 fingers are extended (open palm)."""
    tips = [8, 12, 16, 20]
    mcps = [5, 9, 13, 17]
    open_count = 0
    for t, m in zip(tips, mcps):
        if hand[t].y < hand[m].y:
            open_count += 1
    return open_count >= 3
