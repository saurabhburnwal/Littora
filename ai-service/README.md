# Littora AI Service — Python FastAPI + YOLOv11m Inference

The **ai-service** component is a stateless microservice responsible for real-time computer vision inference on uploaded coastal images. It uses custom-trained YOLO models (YOLOv11 Medium default, YOLOv26 Small, YOLOv8 Medium) to detect, classify, and score beach litter.

---

## Responsibilities

- **Multi-Model Inference & Dynamic Fallback**: Supports YOLOv11 Medium (`yolov11m`), YOLOv26 Small (`yolov26s`), and YOLOv8 Medium (`yolov8m`) with thread-safe lazy model caching and automated fallback mechanisms.
- **FastAPI Lifespan Warm-Up**: Pre-warms active default models on service startup to eliminate cold-start latency.
- **Pydantic Validation**: Strictly typed request/response schemas for `/detect`, `/models`, and `/health` endpoints.
- **Pollution Scoring**: Calculates a normalized pollution score (0–100) and severity classification (`Low`, `Moderate`, `High`, `Severe`) based on waste density and category weights (`severity.py`).
- **Stateless Execution**: Operates purely in-memory; returns JSON inference results without direct database or storage dependencies.

---

## Directory Structure

```text
ai-service/
├── main.py            → FastAPI application & /detect endpoint
├── severity.py        → Pollution scoring algorithm & severity calculator
├── models/            → YOLO model weights directory
│   ├── yolov11m.pt    → Trained YOLOv11 Medium weights
│   └── yolov26s.pt    → Trained YOLOv26 Small weights
├── requirements.txt   → PyTorch, Ultralytics, FastAPI, OpenCV, Uvicorn dependencies
└── README.md
```

---

## Setup & Running

### 1. Create & Activate Virtual Environment
```bash
python -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run FastAPI Server
```bash
uvicorn main:app --reload --port 8000
```
*Service runs on `http://localhost:8000`.*

---

## API Endpoint

### `POST /detect`
- **Content-Type**: `multipart/form-data`
- **Body**: `file` (image binary), `model_name` (optional: `yolov8m`, `yolov11m`, `yolov26s`)
- **Response**:
```json
{
  "detections": [
    { "class": "bottle", "confidence": 0.92, "bbox": [120, 45, 310, 290] },
    { "class": "can", "confidence": 0.88, "bbox": [400, 180, 510, 320] }
  ],
  "total_waste": 2,
  "pollution_score": 24,
  "severity": "Low",
  "model_used": "yolov11m",
  "model_name": "YOLOv11 Medium"
}
```
