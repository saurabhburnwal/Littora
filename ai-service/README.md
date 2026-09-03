# Littora AI Service — Python FastAPI + YOLOv11m Inference

The **ai-service** component is a stateless microservice responsible for real-time computer vision inference on uploaded coastal images. It uses custom-trained YOLO models (YOLOv11 Medium default, YOLOv26 Small, YOLOv8 Medium) to detect, classify, and score beach litter.

---

## Responsibilities

- **Multi-Model Inference & Dynamic Fallback**: Supports YOLOv11 Medium (`yolov11m`), YOLOv26 Small (`yolov26s`), and YOLOv8 Medium (`yolov8m`) with thread-safe lazy model caching and automated fallback mechanisms.
- **Asynchronous Offloading & Thread Safety**: Synchronous PIL image decoding and PyTorch inference are offloaded via `asyncio.to_thread` with an execution synchronization lock to ensure non-blocking event loops and safe shared-model inference.
- **FastAPI Lifespan Warm-Up & Memory Management**: Pre-warms active default models on service startup and cleanly reclaims GPU/CPU memory (`torch.cuda.empty_cache()`, `torch.mps.empty_cache()`, `gc.collect()`) on shutdown.
- **Pydantic Validation**: Strictly typed request/response schemas for `/detect`, `/predict`, `/models`, and `/health` endpoints.
- **Pollution Scoring**: Calculates an unbounded weighted pollution score and severity classification (`Low`, `Moderate`, `High`, `Severe`). Each detected bag, wrapper, bottle, can, and unknown item contributes 5, 3, 2, 2, and 1 point respectively (`severity.py`).
- **Security & Ingestion Guardrails**:
  - **Magic-Byte Signature Inspection**: Inspects binary byte headers for JPEG, PNG, WebP, BMP, and TIFF before tensor decoding.
  - **Polyglot & Script Ingestion Blocker**: Inspects raw byte streams to reject polyglot scripts (`<script`, `<?php`, `<html`, `<svg`, `javascript:`).
  - **Payload Size Enforcement**: Rejects uploads exceeding 10MB (`MAX_CONTENT_LENGTH`) with HTTP 413.
  - **Hardware Fault Defenses**: Gracefully catches CUDA tensor faults and GPU out-of-memory (OOM) exceptions.
- **Stateless Execution**: Operates purely in-memory; returns JSON inference results without direct database or storage dependencies.

---

## Directory Structure

```text
ai-service/
├── main.py            → FastAPI application, magic-byte validation & inference endpoints
├── severity.py        → Pollution scoring algorithm & severity calculator
├── ollama_client.py   → Asynchronous Ollama LLM client for environmental reports
├── report_generator.py → Ollama LLM ecological report synthesis & deterministic fallback
├── cleanup_recommender.py → Actionable cleanup logistics & equipment recommendation engine
├── conftest.py        → Pytest fixtures (ASGI client, sample image, cache cleaner)
├── test_ai_service.py → Comprehensive unit & integration test suite
├── test_challenger1_security.py → Adversarial penetration test suite (magic bytes, polyglots, CORS)
├── test_report_cleanup.py → Ollama report & cleanup recommendation test suite
├── models/            → YOLO model weights directory (yolov11m.pt, yolov26s.pt)
├── requirements.txt   → PyTorch, Ultralytics, FastAPI, Pillow, Uvicorn dependencies
├── pytest.ini         → Pytest test runner configuration
├── pyrightconfig.json → Language server configuration
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

### 4. Run Test Suite
```bash
pytest -v
```
- **Passing**: **205 / 205 tests** (100% pass rate) across unit, Ollama fallback, and adversarial security suites.


---

## Deployment

Build from `ai-service/` with the included Dockerfile. It listens on the
platform-provided `PORT` (falling back to `8000` locally). The custom `.pt`
weights are mounted or deployed at `MODEL_DIR` (default: `/app/models` in the container). The
service returns `503` for inference until a supported weight file is present;
it does not download unrelated public weights at runtime.

---

## API Endpoints

### 1. `GET /health`
- **Response**:
```json
{
  "status": "ok",
  "device": "cpu",
  "loaded_models": ["yolov11m"]
}
```

### 2. `GET /models`
- **Response**:
```json
{
  "models": [
    {
      "id": "yolov11m",
      "name": "YOLOv11 Medium",
      "tag": "Enhanced Accuracy",
      "architecture": "YOLOv11m",
      "params": "20.1M",
      "path": "/app/models/yolov11m.pt",
      "description": "Enhanced feature extraction & attention mechanisms for complex or occluded waste.",
      "badge": "Default (High Precision)",
      "available": true
    }
  ]
}
```

### 3. `POST /detect` & `POST /predict`
- **Content-Type**: `multipart/form-data`
- **Body**: `file` (image binary: JPEG/PNG/WebP), `model_name` (optional: `yolov11m`, `yolov26s`, `yolov8m`)
- **Response**:
```json
{
  "detections": {
    "bottle": 2,
    "can": 1,
    "bag": 0,
    "wrapper": 0
  },
  "total_waste": 3,
  "pollution_score": 6,
  "severity": "Low",
  "boxes": [
    {
      "class_name": "bottle",
      "confidence": 0.94,
      "box": [124.5, 88.0, 310.2, 450.1],
      "box_normalized": [0.1245, 0.088, 0.3102, 0.4501]
    },
    {
      "class_name": "can",
      "confidence": 0.88,
      "box": [400.0, 180.0, 510.0, 320.0],
      "box_normalized": [0.4, 0.18, 0.51, 0.32]
    }
  ],
  "model_used": "yolov11m",
  "model_name": "YOLOv11 Medium"
}
```
