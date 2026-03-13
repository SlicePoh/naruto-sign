# naruto-sign

Naruto hand-sign recognition project with a Python training/API backend and a React + Vite frontend that renders jutsu effects in real time.

This repo currently does three important things:

- trains a hand-sign classifier from landmark-based CSV data in `backend/`
- exports that trained model so the browser can classify signs locally in `frontend/`
- uses the recognized signs plus temporal gesture logic to trigger `Shadow Clone Jutsu` and `Rasengan`

## Repo layout

- `frontend/` — React, Vite, Zustand, MediaPipe, canvas/Three.js effects
- `backend/` — FastAPI API, dataset, training scripts, temporal Rasengan detector

## What the app does

- **Hand-sign classification**: the trained Random Forest predicts signs from a 161-feature vector built from up to two hands.
- **Shadow Clone Jutsu**: the UI watches for the `shadow` sign and activates the clone effect after a hold.
- **Rasengan**: the backend runs a temporal state machine that detects two-hand chakra forming and then waits for an open palm to fire the effect.

## Quick start

### 1. Clone and install

```powershell
git clone https://github.com/SlicePoh/naruto-sign.git
cd naruto-sign
```

### 2. Start the backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.api:app --reload --port 8000
```

### 3. Start the frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

### 4. Open the app

- Visit `http://localhost:5173`
- Allow camera access
- Keep the backend running on `http://127.0.0.1:8000`
- Vite proxies `/api` requests to the backend through `frontend/vite.config.ts`

## How the backend learns hand signs

The training pipeline is landmark-based rather than image-based. Instead of training directly on webcam frames, the project records normalized hand landmark features into `backend/dataset.csv`, then trains a classifier on those numeric features.

### Training data format

- Each hand contributes **80 features**:
	- `63` normalized landmark deltas (`21 landmarks × 3 axes`)
	- `10` joint-angle features
	- `4` fingertip-distance features
	- `3` palm-normal features
- The full sample contains:
	- `80` left-hand features
	- `80` right-hand features
	- `1` wrist-to-wrist distance feature
- Total: **161 input features**, followed by the label column in `dataset.csv`

This same feature logic exists in both places:

- backend extraction: `backend/app/api.py`
- frontend extraction: `frontend/src/classifier/modelFeatures.ts`

That symmetry is important: the browser classifier only works because it builds the exact same features the Python model was trained on.

### How data collection works

The interactive webcam collection flow lives in `backend/app/main.py`.

It does the following:

- opens the webcam with OpenCV
- uses MediaPipe Hand Landmarker to detect up to two hands
- extracts the 161-feature vector for every frame
- appends rows to `dataset.csv` while recording is enabled

Keyboard controls in `backend/app/main.py`:

- **`r`**: toggle recording on/off
- **`1`**: label samples as `ram`
- **`2`**: label samples as `tiger`
- **`3`**: label samples as `horse`
- **`4`**: label samples as `serpent`
- **`5`**: label samples as `dog`
- **`0`**: label samples as `neutral`
- **`q`**: quit

At the moment, the collector hotkeys only cover the labels hard-coded in `backend/app/main.py`. The dataset already contains labels such as `shadow`, but if you want to recollect or expand those classes yourself, update the key mapping in that script first.

### How to collect more training data

1. Activate the backend virtual environment.
2. Make sure `backend/hand_sign_model.pkl` already exists so live predictions can run while collecting.
3. Start the collector:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python app\main.py
```

4. Press the numeric key for the sign you want to record.
5. Press `r` to start recording.
6. Hold the sign from slightly different angles, distances, and lighting conditions.
7. Press `r` again to stop.
8. Repeat for every sign class.
9. Include plenty of `neutral` frames so the model learns when no real jutsu sign is present.
10. If you need new labels such as `shadow`, add a new keyboard shortcut in `backend/app/main.py` before recording.

### How to retrain the backend model

The trainer lives in `backend/app/training_model.py` and trains a `RandomForestClassifier`.

What it does:

- loads and shuffles `backend/dataset.csv`
- splits data into train/test sets with stratification
- trains a `RandomForestClassifier` with `400` trees
- prints class distribution, top feature indices, accuracy, and a classification report
- saves the model to `backend/hand_sign_model.pkl`

Run it with:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python app\training_model.py
```

### How to export the trained model to the frontend

The browser uses a JSON export of the trained Random Forest so sign classification can happen locally without a round-trip.

Export script: `backend/export_model_to_json.py`

It:

- loads `backend/hand_sign_model.pkl`
- serializes each decision tree into a compact JSON structure
- writes the output to `frontend/public/hand_sign_model.json`

Run it after retraining:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python export_model_to_json.py
```

If you skip this step after retraining, the frontend will still be using the old model.

## How sign recognition works at runtime

The project uses a hybrid runtime model:

- **local browser inference** for ordinary hand signs
- **backend temporal inference** for Rasengan state transitions

### Local sign classification in the frontend

Relevant files:

- `frontend/src/classifier/localClassifier.ts`
- `frontend/src/classifier/modelFeatures.ts`
- `frontend/src/App.tsx`

Flow:

1. MediaPipe hand landmarks are detected in the browser.
2. `buildCombinedFeatures()` builds the same 161-feature vector used during training.
3. `loadModel()` loads `public/hand_sign_model.json`.
4. `predictLocal()` evaluates the Random Forest in TypeScript.
5. `App.tsx` debounces predictions before updating the UI state.

This makes sign recognition fast because normal signs do not need the backend after the model has been exported.

## How Shadow Clone Jutsu works

Shadow Clone is primarily a frontend/UI effect driven by the recognized `shadow` sign.

Relevant files:

- `frontend/src/effects/useShadowCloneHold.ts`
- `frontend/src/effects/ShadowClone.tsx`
- `frontend/src/effects/renderShadowClones.ts`
- `frontend/src/store/useAppStore.ts`

### Shadow Clone behavior

- the current sign must be `shadow`
- the sign must be held for **2 seconds** in `useShadowCloneHold.ts`
- once activated, the store marks `shadowCloneActive = true`
- the effect stays active for **10 seconds** via the Zustand store
- `renderShadowClones.ts` draws two offset copies of the segmented person onto the overlay canvas

### How to achieve Shadow Clone in the app

1. Run backend and frontend.
2. Let the frontend load the exported model.
3. Present the `shadow` hand sign clearly to the camera.
4. Hold the sign steady for about **2 seconds**.
5. The UI triggers `shadowClone` and renders the duplicate body overlays.

### How to customize Shadow Clone as a developer

- change hold duration in `frontend/src/effects/useShadowCloneHold.ts`
- change active duration in `frontend/src/store/useAppStore.ts`
- change clone spread and burst animation in `frontend/src/effects/renderShadowClones.ts`
- improve segmentation behavior in `frontend/src/effects/useSelfieSegmentation.ts`

## How Rasengan works

Rasengan combines backend state detection with frontend rendering.

Relevant files:

- backend state machine: `backend/app/rasengan_detector.py`
- backend API integration: `backend/app/api.py`
- frontend polling hook: `frontend/src/effects/rasengan/useRasenganDetection.ts`
- frontend effect lifecycle: `frontend/src/effects/rasengan/useRasengan.ts`
- effect rendering: `frontend/src/effects/rasengan/RasenganEffect.ts`
- UI state: `frontend/src/store/useAppStore.ts`

### Rasengan detection pipeline

1. The frontend sends hand landmarks to `POST /api/predict/landmarks`.
2. The backend extracts left/right features and predicts the normal sign.
3. In parallel, `RasenganDetector` tracks the two wrists over time.
4. The detector progresses through these states:
	 - `IDLE`
	 - `FORMING`
	 - `SPINNING`
	 - `CHAKRA_READY`
5. When `CHAKRA_READY` is reached, the backend waits for an open palm.
6. If an open palm is detected, the API responds with `jutsu = "rasengan"`.
7. The frontend activates the effect, tracks palm position, and renders the spinning chakra orb.

### Rasengan thresholds in the backend

In `backend/app/rasengan_detector.py` the defaults are:

- wrists enter forming when distance is below `0.18`
- reset when wrists move beyond `0.25`
- hold time is `1.2s`
- spin shortcut threshold is `1.5`
- spin completion time is `0.8s`

### How to achieve Rasengan in the app

1. Run both services.
2. Put both hands in frame.
3. Bring the wrists close together to enter the chakra-forming state.
4. Hold the hands together or make the circular/spinning motion long enough to reach `CHAKRA_READY`.
5. Open one palm while staying in the ready state.
6. The backend returns `jutsu: "rasengan"` and the frontend starts the animated effect.

### How to tune Rasengan as a developer

- adjust temporal thresholds in `backend/app/rasengan_detector.py`
- change polling cadence in `frontend/src/effects/rasengan/useRasenganDetection.ts`
- change duration in `frontend/src/effects/rasengan/RasenganEffect.ts`
- change auto-reset logic in `frontend/src/store/useAppStore.ts`

## API overview

The backend server is implemented in `backend/app/api.py`.

Endpoints:

- `GET /api/health`
- `POST /api/predict/landmarks`

Example request body:

```json
{
	"hands": [
		[{ "x": 0.0, "y": 0.0, "z": 0.0 }],
		[{ "x": 0.0, "y": 0.0, "z": 0.0 }]
	]
}
```

Example response body:

```json
{
	"sign": "shadow",
	"confidence": 0.93,
	"method": "model",
	"hands": 2,
	"jutsu": "shadow_clone",
	"chakra_state": null
}
```

## Forking or cloning this project

If you want to fork this project and extend it, these are the important implementation details to understand first.

### Core technical knowledge

- **The model is feature-based, not image-based**: changing landmark feature extraction breaks compatibility with the trained model.
- **Training and inference must match exactly**: if you edit the backend feature engineering, update `frontend/src/classifier/modelFeatures.ts` too.
- **Frontend and backend have different jobs**:
	- frontend handles camera, MediaPipe, local sign inference, and effects
	- backend handles training, API responses, and temporal Rasengan detection
- **The exported JSON model is a build artifact**: retrain -> export -> restart frontend.
- **Shadow Clone is UI-state driven**: no backend state machine is required for that effect.
- **Rasengan is temporal**: it depends on motion over time, which is why it still uses the backend API loop.

### Recommended workflow for contributors

1. Fork the repo.
2. Clone your fork.
3. Create and activate the backend virtual environment.
4. Install frontend dependencies.
5. Start backend and frontend separately.
6. Verify `GET /api/health` works before debugging the UI.
7. If you change sign classes or dataset shape:
	 - recollect data
	 - retrain the Python model
	 - export JSON again
	 - verify the frontend still expects the same feature count

### Common extension ideas

- add more hand-sign labels to the dataset and retrain
- add more jutsu sequences in `frontend/src/jutsuEngine/jutsuRegistry.ts`
- move more temporal gestures into backend state machines similar to Rasengan
- improve confidence thresholds and sign debounce behavior in `frontend/src/App.tsx`
- add a dedicated data-collection script for new signs like `shadow`

## Useful commands

### Run the backend API

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.api:app --reload --port 8000
```

### Run the frontend

```powershell
cd frontend
npm install
npm run dev
```

### Retrain and export a new model

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python app\training_model.py
python export_model_to_json.py
```

## Notes

- `backend/app/main.py` is useful for webcam-driven data collection, but it imports extra packages such as MediaPipe and OpenCV that are not documented in `backend/requirements.txt` yet.
- The committed dataset and model artifacts live in `backend/` and `frontend/public/`.
- The frontend includes manual test buttons in `frontend/src/App.tsx` for quickly triggering Shadow Clone and Rasengan during development.
