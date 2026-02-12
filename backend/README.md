# Backend (Python)

FastAPI service that will classify Naruto hand signs.

## API

- `GET /health` → `{ status: "ok" }`
- `POST /predict/landmarks`
  - Body:
    ```json
    {
      "hands": [
        [ {"x":0.0,"y":0.0,"z":0.0}, {"x":0.0,"y":0.0,"z":0.0} ]
      ]
    }
    ```
  - Response:
    ```json
    {"sign":"tiger","confidence":1.0,"method":"rule","hands":1}
    ```

`/predict/image` is stubbed for later.

## Run

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
