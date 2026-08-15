"""
AI Service — beach waste detection.

Supports multi-model inference (YOLOv8 Medium, YOLOv11 Medium, YOLOv26 Small).
Stateless FastAPI service — Node backend orchestrates model selection and persistence.
"""

from contextlib import asynccontextmanager
import io
import logging
from pathlib import Path
import threading
from typing import Any, Dict

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field
import torch
from ultralytics import YOLO

from severity import compute_score

# Structured logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ai_service")

# Absolute path resolution for models directory
BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"

MODELS_CONFIG: Dict[str, Dict[str, Any]] = {
    "yolov8m": {
        "id": "yolov8m",
        "name": "YOLOv8 Medium",
        "tag": "Standard Baseline",
        "architecture": "YOLOv8m",
        "params": "25.9M",
        "path": MODELS_DIR / "best.pt",
        "description": "Balanced speed & precision for general coastal debris detection.",
        "badge": "Baseline",
    },
    "yolov11m": {
        "id": "yolov11m",
        "name": "YOLOv11 Medium",
        "tag": "Enhanced Accuracy",
        "architecture": "YOLOv11m",
        "params": "20.1M",
        "path": MODELS_DIR / "yolov11m.pt",
        "description": "Enhanced feature extraction & attention mechanisms for complex or occluded waste.",
        "badge": "Default (High Precision)",
    },
    "yolov26s": {
        "id": "yolov26s",
        "name": "YOLOv26 Small",
        "tag": "Ultra-Fast Edge",
        "architecture": "YOLOv26s",
        "params": "9.6M",
        "path": MODELS_DIR / "yolov26s.pt",
        "description": "Lightweight, low-latency inference optimized for real-time mobile & drone feeds.",
        "badge": "Fastest",
    },
}

CLASS_NORMALIZATION: Dict[str, str] = {
    "bottle": "bottle",
    "can": "can",
    "bag": "bag",
    "wrapper": "wrapper",
}

# Thread-safe model cache
_loaded_models: Dict[str, YOLO] = {}
_model_lock = threading.Lock()


def get_yolo_model(model_id: str) -> tuple[YOLO, str]:
    """
    Retrieves or dynamically loads a requested YOLO model with dynamic fallback logic.
    Thread-safe model loading ensures single initialization per model weights file.
    """
    target = MODELS_CONFIG.get(model_id, MODELS_CONFIG["yolov11m"])
    target_path = Path(target["path"])

    with _model_lock:
        if model_id in _loaded_models:
            return _loaded_models[model_id], target["name"]

        # 1. Try specified path
        if target_path.exists():
            try:
                model = YOLO(str(target_path))
                _loaded_models[model_id] = model
                logger.info(f"Loaded model '{model_id}' from {target_path}")
                return model, target["name"]
            except Exception as err:
                logger.warning(f"Failed to load model weights at {target_path}: {err}")

        # 2. Dynamic Fallback: check available model files in models/ directory
        fallback_candidates = [
            MODELS_DIR / "yolov11m.pt",
            MODELS_DIR / "yolov26s.pt",
            MODELS_DIR / "best.pt",
        ]

        if MODELS_DIR.exists():
            for extra_pt in MODELS_DIR.glob("*.pt"):
                if extra_pt not in fallback_candidates:
                    fallback_candidates.append(extra_pt)

        for fb_path in fallback_candidates:
            if fb_path.exists():
                fb_key = fb_path.stem
                if fb_key not in _loaded_models:
                    try:
                        _loaded_models[fb_key] = YOLO(str(fb_path))
                        logger.info(f"Loaded fallback model '{fb_key}' from {fb_path}")
                    except Exception as ex:
                        logger.warning(f"Could not load fallback model at {fb_path}: {ex}")
                        continue
                return _loaded_models[fb_key], target["name"]

        # 3. Final fallback: download lightweight standard weights if local weights missing
        if "default" not in _loaded_models:
            logger.info("Falling back to standard default YOLO model 'yolov8n.pt'")
            _loaded_models["default"] = YOLO("yolov8n.pt")

        return _loaded_models["default"], target["name"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI Lifespan context manager for warm-up and graceful shutdown.
    Pre-loads default YOLO model to eliminate cold-start latency on first request.
    """
    logger.info("Initializing Beach Waste Detection AI Service...")
    try:
        get_yolo_model("yolov11m")
    except Exception as e:
        logger.warning(f"Initial model warm-up failed: {e}")
    yield
    _loaded_models.clear()
    if torch.cuda.is_available():
        try:
            torch.cuda.empty_cache()
        except Exception:
            pass
    logger.info("AI Service shut down cleanly.")


app = FastAPI(
    title="Beach Waste Detection AI Service",
    description="Stateless computer vision inference service powered by YOLO models",
    version="1.0.0",
    lifespan=lifespan,
)


# --- Pydantic Request / Response Models ---

class HealthResponse(BaseModel):
    status: str = "ok"
    device: str
    loaded_models: list[str]


class ModelInfo(BaseModel):
    id: str
    name: str
    tag: str
    architecture: str
    params: str
    path: str
    description: str
    badge: str
    available: bool


class ModelListResponse(BaseModel):
    models: list[ModelInfo]


class BoundingBox(BaseModel):
    class_name: str
    confidence: float
    box: list[float] = Field(..., description="Bounding box pixel coordinates [x1, y1, x2, y2]")
    box_normalized: list[float] = Field(..., description="Normalized bounding box coordinates [x1, y1, x2, y2] (0..1)")


class DetectionResponse(BaseModel):
    detections: dict[str, int]
    total_waste: int
    pollution_score: int
    severity: str
    boxes: list[BoundingBox]
    model_used: str
    model_name: str


# --- Core Helper ---

async def _process_detection(file: UploadFile, model_name: str) -> DetectionResponse:
    """Core image processing and inference pipeline."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File provided is not a valid image format."
        )

    contents = await file.read()
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except UnidentifiedImageError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not decode image file. File may be corrupted or unsupported image format."
        )
    except Exception as err:
        logger.error(f"Error reading image: {err}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to read image content."
        )

    try:
        model, model_display_name = get_yolo_model(model_name)
        with torch.inference_mode():
            results = model.predict(image, verbose=False)[0]
    except Exception as err:
        logger.error(f"Inference error during model execution: {err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference failed: {str(err)}"
        )

    detections: dict[str, int] = {}
    boxes: list[BoundingBox] = []
    w, h = image.size

    for box in results.boxes:
        class_id = int(box.cls[0])
        raw_name = str(model.names[class_id]).lower().strip()
        name = CLASS_NORMALIZATION.get(raw_name, raw_name)
        detections[name] = detections.get(name, 0) + 1

        xyxy = box.xyxy[0].tolist()
        conf = float(box.conf[0])

        b_pixel = [
            round(xyxy[0], 1),
            round(xyxy[1], 1),
            round(xyxy[2], 1),
            round(xyxy[3], 1),
        ]

        b_norm = [
            round(max(0.0, min(1.0, xyxy[0] / w)), 4),
            round(max(0.0, min(1.0, xyxy[1] / h)), 4),
            round(max(0.0, min(1.0, xyxy[2] / w)), 4),
            round(max(0.0, min(1.0, xyxy[3] / h)), 4),
        ]

        boxes.append(
            BoundingBox(
                class_name=name,
                confidence=round(conf, 2),
                box=b_pixel,
                box_normalized=b_norm,
            )
        )

    total_waste, pollution_score, severity = compute_score(detections)

    return DetectionResponse(
        detections=detections,
        total_waste=total_waste,
        pollution_score=pollution_score,
        severity=severity,
        boxes=boxes,
        model_used=model_name,
        model_name=model_display_name,
    )


# --- API Routes ---

@app.get("/health", response_model=HealthResponse)
def health():
    """Health check endpoint returning status, hardware compute device, and loaded models."""
    device = "cuda" if torch.cuda.is_available() else ("mps" if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available() else "cpu")
    return HealthResponse(
        status="ok",
        device=device,
        loaded_models=list(_loaded_models.keys()),
    )


@app.get("/models", response_model=ModelListResponse)
def list_models():
    """Returns metadata for all supported models and their local availability status."""
    models_list = []
    for m_id, cfg in MODELS_CONFIG.items():
        path_obj = Path(cfg["path"])
        item = {
            **cfg,
            "path": str(cfg["path"]),
            "available": path_obj.exists(),
        }
        models_list.append(ModelInfo(**item))
    return ModelListResponse(models=models_list)


@app.post("/detect", response_model=DetectionResponse)
async def detect(
    file: UploadFile = File(...),
    model_name: str = Form("yolov11m")
):
    """Primary detection endpoint."""
    return await _process_detection(file, model_name)


@app.post("/predict", response_model=DetectionResponse)
async def predict(
    file: UploadFile = File(...),
    model_name: str = Form("yolov11m")
):
    """Inference alias endpoint for /detect."""
    return await _process_detection(file, model_name)

