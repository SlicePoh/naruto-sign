from __future__ import annotations

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .predictor import predict
from .schemas import PredictLandmarksRequest, PredictResponse

app = FastAPI(title="Naruto Sign Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict/landmarks", response_model=PredictResponse)
def predict_landmarks(payload: PredictLandmarksRequest):
    result = predict(payload)
    return PredictResponse(
        sign=result.sign,
        confidence=result.confidence,
        method="model" if result.method == "model" else "rule",
        hands=len(payload.hands),
    )


@app.post("/predict/image")
async def predict_image(image: UploadFile = File(...)):
    # Intentionally not implemented yet: this would run Python-side landmark detection
    # (e.g., MediaPipe Python or another model) and then classify.
    raise HTTPException(status_code=501, detail="/predict/image not implemented yet; use /predict/landmarks")
