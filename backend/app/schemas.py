from __future__ import annotations

from typing import Literal, Sequence

from pydantic import BaseModel, Field

SignLabel = Literal[
    "tiger",
    "ram",
    "snake",
    "bird",
    "boar",
    "ox",
    "dragon",
    "unknown",
]


class Landmark(BaseModel):
    x: float
    y: float
    z: float


class PredictLandmarksRequest(BaseModel):
    hands: list[list[Landmark]] = Field(
        default_factory=list, description="0..2 hands; each hand should have 21 landmarks"
    )


class PredictResponse(BaseModel):
    sign: SignLabel
    confidence: float = Field(ge=0.0, le=1.0)
    method: Literal["rule", "model"]
    hands: int
