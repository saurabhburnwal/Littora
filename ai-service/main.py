"""
AI Service — beach waste detection.

Supports multi-model inference (YOLOv8 Medium, YOLOv11 Medium, YOLOv26 Small).
Stateless FastAPI service — Node backend orchestrates model selection and persistence.
"""

import asyncio
from contextlib import asynccontextmanager
import gc
import io
import logging
import os
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

# Absolute path resolution allows managed deployments to mount model artifacts
# outside the application source tree.
BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = Path(os.getenv("MODEL_DIR", str(BASE_DIR / "models"))).resolve()

MODELS_CONFIG: Dict[str, Dict[str, Any]] = {
    "yolov8m": {
        "id": "yolov8m",
        "name": "YOLOv8 Medium",
        "tag": "Standard Baseline",
        "architecture": "YOLOv8m",
        "params": "25.9M",
        "filename": "best.pt",
        "description": "Balanced speed & precision for general coastal debris detection.",
        "badge": "Baseline",
    },
    "yolov11m": {
        "id": "yolov11m",
        "name": "YOLOv11 Medium",
        "tag": "Enhanced Accuracy",
        "architecture": "YOLOv11m",
        "params": "20.1M",
        "filename": "yolov11m.pt",
        "description": "Enhanced feature extraction & attention mechanisms for complex or occluded waste.",
        "badge": "Default (High Precision)",
    },
    "yolov26s": {
        "id": "yolov26s",
        "name": "YOLOv26 Small",
        "tag": "Ultra-Fast Edge",
        "architecture": "YOLOv26s",
        "params": "9.6M",
        "filename": "yolov26s.pt",
        "description": "Lightweight, low-latency inference optimized for real-time mobile & drone feeds.",
        "badge": "Fastest",
    },
}

CLASS_NORMALIZATION: Dict[str, str] = {
    # Canonical labels (identity)
    "bottle": "bottle",
    "can": "can",
    "bag": "bag",
    "wrapper": "wrapper",
    # Bottle variants
    "plastic_bottle": "bottle",
    "plastic bottle": "bottle",
    "glass_bottle": "bottle",
    "glass bottle": "bottle",
    "water_bottle": "bottle",
    "water bottle": "bottle",
    # Can variants
    "metal_can": "can",
    "metal can": "can",
    "aluminum_can": "can",
    "aluminum can": "can",
    "tin_can": "can",
    "tin can": "can",
    "beverage_can": "can",
    "soda_can": "can",
    # Bag variants
    "plastic_bag": "bag",
    "plastic bag": "bag",
    "trash_bag": "bag",
    "trash bag": "bag",
    "grocery_bag": "bag",
    "shopping_bag": "bag",
    # Wrapper variants
    "food_wrapper": "wrapper",
    "food wrapper": "wrapper",
    "plastic_wrapper": "wrapper",
    "plastic wrapper": "wrapper",
    "snack_wrapper": "wrapper",
    "candy_wrapper": "wrapper",
    "chip_bag": "wrapper",
}

# Thread-safe model cache and synchronization locks
_loaded_models: Dict[str, YOLO] = {}
_model_lock = threading.Lock()
_inference_lock = threading.Lock()


class ModelWeightsUnavailable(RuntimeError):
    """Raised when no deployed custom model artifact is available."""


def model_path(config: Dict[str, Any]) -> Path:
    """Resolve a model file against the deployment-configured model directory."""
    return MODELS_DIR / config["filename"]


def get_yolo_model(model_id: str) -> tuple[YOLO, str, str]:
    """
    Retrieves or dynamically loads a requested YOLO model with dynamic fallback logic.
    Thread-safe model loading ensures single initialization per model weights file.
    """
    target_id = model_id if model_id in MODELS_CONFIG else "yolov11m"
    target = MODELS_CONFIG[target_id]
    target_path = model_path(target)

    with _model_lock:
        if target_id in _loaded_models:
            return _loaded_models[target_id], target_id, target["name"]

        # 1. Try specified path
        if target_path.exists():
            try:
                model = YOLO(str(target_path))
                _loaded_models[target_id] = model
                logger.info(f"Loaded model '{target_id}' from {target_path}")
                return model, target_id, target["name"]
            except Exception as err:
                logger.warning(f"Failed to load model weights at {target_path}: {err}")

        # 2. Dynamic Fallback: check available model files in models/ directory
        fallback_candidates = [
            ("yolov11m", MODELS_DIR / "yolov11m.pt"),
            ("yolov26s", MODELS_DIR / "yolov26s.pt"),
            ("yolov8m", MODELS_DIR / "best.pt"),
        ]

        if MODELS_DIR.exists():
            known_paths = {path for _, path in fallback_candidates}
            for extra_pt in MODELS_DIR.glob("*.pt"):
                if extra_pt not in known_paths:
                    fallback_candidates.append((extra_pt.stem, extra_pt))
                    known_paths.add(extra_pt)

        for fallback_id, fb_path in fallback_candidates:
            if fb_path.exists():
                if fallback_id not in _loaded_models:
                    try:
                        _loaded_models[fallback_id] = YOLO(str(fb_path))
                        logger.info(f"Loaded fallback model '{fallback_id}' from {fb_path}")
                    except Exception as ex:
                        logger.warning(f"Could not load fallback model at {fb_path}: {ex}")
                        continue
                fallback_config = MODELS_CONFIG.get(fallback_id)
                fallback_name = fallback_config["name"] if fallback_config else fallback_id
                return _loaded_models[fallback_id], fallback_id, fallback_name

        raise ModelWeightsUnavailable(
            f"No model weights found in {MODELS_DIR}. Deploy a supported .pt artifact "
            "or set MODEL_DIR to its mounted location."
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI Lifespan context manager for warm-up and graceful shutdown.
    Pre-loads default YOLO model to eliminate cold-start latency on first request.
    Reclaims GPU/CPU memory and clears caches on shutdown.
    """
    logger.info("Initializing Beach Waste Detection AI Service...")
    try:
        get_yolo_model("yolov11m")
    except Exception as e:
        logger.warning(f"Initial model warm-up failed: {e}")
    yield
    with _model_lock:
        _loaded_models.clear()
    if torch.cuda.is_available():
        try:
            torch.cuda.empty_cache()
        except Exception:
            pass
    if (
        hasattr(torch, "mps")
        and hasattr(torch.mps, "empty_cache")
        and getattr(torch.backends, "mps", None)
        and torch.backends.mps.is_available()
    ):
        try:
            torch.mps.empty_cache()
        except Exception:
            pass
    gc.collect()
    logger.info("AI Service shut down cleanly.")


app = FastAPI(
    title="Beach Waste Detection AI Service",
    description="Stateless computer vision inference service powered by YOLO models",
    version="1.0.0",
    lifespan=lifespan,
)

from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:4000,http://127.0.0.1:4000,http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


from schemas import (
    BoundingBox,
    CleanupRecommendationItem,
    CleanupRecommendationsRequest,
    CleanupRecommendationsResponse,
    CleanupRequest,
    CleanupResponse,
    DetectionResponse,
    HealthResponse,
    ModelInfo,
    ModelListResponse,
    ReportGenerateRequest,
    ReportGenerateResponse,
    ReportRequest,
    ReportResponse,
)
import ollama_client
import report_generator
import cleanup_recommender


# --- Core Helpers for Thread Offloading, Validation & Synchronization ---

MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB maximum payload limit


def validate_magic_bytes_and_format(data: bytes) -> str:
    """
    Validates magic byte signatures for allowed image formats (JPEG, PNG, WebP)
    and guards against truncated payloads and malicious polyglot script injections.
    Raises HTTPException 400 if validation fails.
    Returns the detected canonical MIME type string.
    """
    if len(data) < 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not decode image file: File provided is too small or truncated (< 12 bytes).",
        )

    # Polyglot inspection: scan first 4096 bytes for active script and markup tags
    sample = data[:4096].lower()
    dangerous_signatures = [b"<script", b"<?php", b"<html", b"javascript:", b"<svg"]
    if any(sig in sample for sig in dangerous_signatures):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Security violation: Polyglot image payload rejected.",
        )

    # Magic byte verification
    is_jpeg = data[:3] == b"\xff\xd8\xff"
    is_png = data[:8] == b"\x89PNG\r\n\x1a\n"
    is_webp = data[:4] == b"RIFF" and data[8:12] == b"WEBP"
    is_bmp = data[:2] == b"BM"
    is_tiff = len(data) >= 4 and (data[:4] == b"II*\x00" or data[:4] == b"MM\x00*")

    if is_jpeg:
        return "image/jpeg"
    if is_png:
        return "image/png"
    if is_webp:
        return "image/webp"
    if is_bmp:
        return "image/bmp"
    if is_tiff:
        return "image/tiff"

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Could not decode image file: Invalid image signature. Only JPEG, PNG, and WebP images are permitted.",
    )


def _sync_load_image(data: bytes) -> Image.Image:
    """Synchronously decode image bytes in a worker thread."""
    img = Image.open(io.BytesIO(data))
    return img.convert("RGB")


def _sync_inference(
    model_name: str, image: Image.Image
) -> tuple[Any, str, str, dict[int, str]]:
    """
    Synchronously run YOLO inference in a worker thread with an execution lock.
    Serializes inference calls on shared YOLO model instances to ensure thread safety.
    Uses GPU acceleration (CUDA / MPS) whenever available to maximize performance and minimize CPU load.
    Catches GPU OutOfMemoryError, clears CUDA cache, and falls back to CPU inference.
    """
    model, model_id, model_display_name = get_yolo_model(model_name)
    device = "cuda" if torch.cuda.is_available() else ("mps" if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available() else "cpu")
    with _inference_lock:
        try:
            with torch.inference_mode():
                results = model.predict(image, device=device, verbose=False)[0]
        except (torch.cuda.OutOfMemoryError, RuntimeError) as err:
            is_oom = isinstance(err, torch.cuda.OutOfMemoryError) or "out of memory" in str(err).lower()
            if is_oom and device != "cpu":
                logger.warning(
                    f"CUDA OOM encountered during model '{model_id}' inference ({err}). "
                    "Evicting VRAM cache and retrying on CPU..."
                )
                if torch.cuda.is_available():
                    try:
                        torch.cuda.empty_cache()
                    except Exception:
                        pass
                gc.collect()
                with torch.inference_mode():
                    results = model.predict(image, device="cpu", verbose=False)[0]
            else:
                raise
    names_dict = getattr(results, "names", getattr(model, "names", {}))
    return results, model_id, model_display_name, names_dict


async def _process_detection(file: UploadFile, model_name: str) -> DetectionResponse:
    """Core image processing and inference pipeline."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File provided is not a valid image format."
        )

    if file.size and file.size > MAX_CONTENT_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds maximum limit of 10MB."
        )

    contents = await file.read()
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    if len(contents) > MAX_CONTENT_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds maximum limit of 10MB."
        )

    validate_magic_bytes_and_format(contents)

    try:
        image = await asyncio.to_thread(_sync_load_image, contents)
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
        results, model_id, model_display_name, class_names = await asyncio.to_thread(
            _sync_inference, model_name, image
        )
    except ModelWeightsUnavailable as err:
        logger.error(str(err))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(err),
        )
    except HTTPException:
        raise
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
        raw_name = str(class_names.get(class_id, class_id)).lower().strip()
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
        model_used=model_id,
        model_name=model_display_name,
    )


# --- API Routes ---

@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint returning status, hardware compute device, loaded models, and Ollama connectivity."""
    device = "cuda" if torch.cuda.is_available() else ("mps" if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available() else "cpu")
    with _model_lock:
        loaded_models = list(_loaded_models.keys())
    _, ollama_status = await ollama_client.check_liveness()
    return HealthResponse(
        status="ok",
        device=device,
        loaded_models=loaded_models,
        ollama_status=ollama_status,
        ollama_model=ollama_client.OLLAMA_MODEL,
        ollama_url=ollama_client.OLLAMA_BASE_URL,
    )


@app.get("/models", response_model=ModelListResponse)
def list_models():
    """Returns metadata for all supported models and their local availability status."""
    models_list = []
    for m_id, cfg in MODELS_CONFIG.items():
        path_obj = model_path(cfg)
        item = {
            **cfg,
            "path": str(path_obj),
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


@app.post("/report/generate", response_model=ReportResponse)
async def generate_report_endpoint(request: ReportRequest) -> ReportResponse:
    """
    Generates a multi-period environmental audit report synthesizing executive summary,
    risk assessment, and actionable takeaways using Ollama LLM with deterministic statistical fallback.
    """
    return await report_generator.generate_report(request)


@app.post("/cleanup/recommendations", response_model=CleanupResponse)
async def cleanup_recommendations_endpoint(request: CleanupRequest) -> CleanupResponse:
    """
    Synthesizes prioritized, contextual cleanup intervention plans, volunteer/time estimates,
    equipment lists, and targeted coastal zones using Ollama LLM with deterministic fallback.
    """
    return await cleanup_recommender.generate_cleanup_recommendations(request)

