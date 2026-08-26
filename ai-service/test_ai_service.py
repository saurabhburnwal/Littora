"""
Pytest suite for AI Service (severity scoring, model loading, FastAPI async endpoints, lifespan, & normalization).
"""

from pathlib import Path
from tempfile import TemporaryDirectory

import pytest
from httpx import AsyncClient

import main as main_module
from severity import compute_score
from main import (
    ModelWeightsUnavailable,
    get_yolo_model,
    health,
    lifespan,
    list_models,
    MODELS_CONFIG,
    app,
    _loaded_models,
)


# --- 1. Severity Scoring Tests (Parametrized) ---

@pytest.mark.parametrize(
    "detections, expected_total, expected_score, expected_severity",
    [
        # Empty / None
        ({}, 0, 0, "Low"),
        (None, 0, 0, "Low"),
        # Low severity: bottle (2.0 * 2 = 4), can (2.0 * 1 = 2) => score 6 <= 10
        ({"bottle": 2, "can": 1}, 3, 6, "Low"),
        # Moderate severity: bag (5.0 * 4 = 20), wrapper (3.0 * 2 = 6) => score 26 (11-30)
        ({"bag": 4, "wrapper": 2}, 6, 26, "Moderate"),
        # High severity: bag (5.0 * 10 = 50) => score 50 (31-60)
        ({"bag": 10}, 10, 50, "High"),
        # Severe severity: bag (5.0 * 13 = 65) => score 65 (>60)
        ({"bag": 13}, 13, 65, "Severe"),
        # Unknown categories fallback to default 1.0 weight
        ({"plastic_chair": 5}, 5, 5, "Low"),
        # Safe handling of negative counts
        ({"bottle": -2, "can": 3}, 3, 6, "Low"),
    ],
)
def test_compute_score_scenarios(
    detections, expected_total, expected_score, expected_severity
):
    total, score, severity = compute_score(detections)
    assert total == expected_total
    assert score == expected_score
    assert severity == expected_severity


# --- 2. Class Normalization Tests (Parametrized) ---

@pytest.mark.parametrize(
    "raw_label, expected_canonical",
    [
        ("bottle", "bottle"),
        ("can", "can"),
        ("bag", "bag"),
        ("wrapper", "wrapper"),
        ("plastic_bottle", "bottle"),
        ("plastic bottle", "bottle"),
        ("glass_bottle", "bottle"),
        ("glass bottle", "bottle"),
        ("water_bottle", "bottle"),
        ("metal_can", "can"),
        ("aluminum_can", "can"),
        ("tin_can", "can"),
        ("soda_can", "can"),
        ("plastic_bag", "bag"),
        ("trash_bag", "bag"),
        ("grocery_bag", "bag"),
        ("shopping_bag", "bag"),
        ("food_wrapper", "wrapper"),
        ("plastic_wrapper", "wrapper"),
        ("snack_wrapper", "wrapper"),
        ("candy_wrapper", "wrapper"),
        ("chip_bag", "wrapper"),
        ("unknown_debris", "unknown_debris"),
    ],
)
def test_class_normalization_mappings(raw_label, expected_canonical):
    normalized = main_module.CLASS_NORMALIZATION.get(raw_label, raw_label)
    assert normalized == expected_canonical


# --- 3. Direct Function Tests ---

def test_health_direct():
    res = health()
    assert res.status == "ok"
    assert res.device in ["cuda", "mps", "cpu"]
    assert isinstance(res.loaded_models, list)


def test_models_direct():
    res = list_models()
    assert len(res.models) == len(MODELS_CONFIG)
    model_ids = [m.id for m in res.models]
    assert "yolov11m" in model_ids
    assert "yolov26s" in model_ids


# --- 4. Async FastAPI HTTP Endpoint Tests (Parametrized) ---

async def test_health_endpoint_async(async_client: AsyncClient):
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "device" in data
    assert "loaded_models" in data


async def test_models_endpoint_async(async_client: AsyncClient):
    response = await async_client.get("/models")
    assert response.status_code == 200
    data = response.json()
    assert "models" in data
    assert len(data["models"]) >= 2


@pytest.mark.parametrize("endpoint", ["/detect", "/predict"])
@pytest.mark.parametrize("model_name", ["yolov11m", "yolov26s"])
async def test_detect_and_predict_successful_inference(
    async_client: AsyncClient, sample_image_bytes: bytes, endpoint: str, model_name: str
):
    files = {"file": ("test.jpg", sample_image_bytes, "image/jpeg")}
    response = await async_client.post(endpoint, files=files, data={"model_name": model_name})
    assert response.status_code == 200
    data = response.json()
    assert "detections" in data
    assert isinstance(data["detections"], dict)
    assert "total_waste" in data
    assert isinstance(data["total_waste"], int)
    assert "pollution_score" in data
    assert isinstance(data["pollution_score"], int)
    assert "severity" in data
    assert data["severity"] in ["Low", "Moderate", "High", "Severe"]
    assert "boxes" in data
    assert isinstance(data["boxes"], list)
    assert data["model_used"] == model_name
    assert "model_name" in data


@pytest.mark.parametrize("endpoint", ["/detect", "/predict"])
async def test_detect_and_predict_default_model(
    async_client: AsyncClient, sample_image_bytes: bytes, endpoint: str
):
    files = {"file": ("test.jpg", sample_image_bytes, "image/jpeg")}
    response = await async_client.post(endpoint, files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["model_used"] in ["yolov11m", "yolov26s"]


@pytest.mark.parametrize("endpoint", ["/detect", "/predict"])
async def test_detect_predict_empty_file_upload(
    async_client: AsyncClient, endpoint: str
):
    files = {"file": ("empty.jpg", b"", "image/jpeg")}
    response = await async_client.post(endpoint, files=files)
    assert response.status_code == 400
    data = response.json()
    assert data["detail"] == "Uploaded file is empty."


@pytest.mark.parametrize("mime_type", ["text/plain", "application/json", "application/octet-stream"])
@pytest.mark.parametrize("endpoint", ["/detect", "/predict"])
async def test_detect_predict_invalid_mime_type(
    async_client: AsyncClient, endpoint: str, mime_type: str
):
    files = {"file": ("badfile.dat", b"random non-image content", mime_type)}
    response = await async_client.post(endpoint, files=files)
    assert response.status_code == 400
    data = response.json()
    assert data["detail"] == "File provided is not a valid image format."


@pytest.mark.parametrize("endpoint", ["/detect", "/predict"])
async def test_detect_predict_corrupted_image(
    async_client: AsyncClient, endpoint: str
):
    files = {"file": ("corrupt.jpg", b"not-a-valid-jpeg-stream", "image/jpeg")}
    response = await async_client.post(endpoint, files=files)
    assert response.status_code == 400
    data = response.json()
    assert "Could not decode image file" in data["detail"]


@pytest.mark.parametrize("endpoint", ["/detect", "/predict"])
async def test_detect_predict_inference_exception_500(
    async_client: AsyncClient, sample_image_bytes: bytes, endpoint: str, monkeypatch
):
    class CrashingModel:
        def predict(self, *args, **kwargs):
            raise RuntimeError("Unexpected CUDA tensor compute fault")

    monkeypatch.setattr(
        main_module, "get_yolo_model", lambda name: (CrashingModel(), "yolov11m", "YOLOv11 Medium")
    )

    files = {"file": ("test.jpg", sample_image_bytes, "image/jpeg")}
    response = await async_client.post(endpoint, files=files)
    assert response.status_code == 500
    data = response.json()
    assert "Inference failed" in data["detail"]
    assert "Unexpected CUDA tensor compute fault" in data["detail"]


@pytest.mark.parametrize("endpoint", ["/detect", "/predict"])
async def test_detect_predict_weights_unavailable_503(
    async_client: AsyncClient, sample_image_bytes: bytes, endpoint: str, monkeypatch
):
    def raise_unavailable(name):
        raise ModelWeightsUnavailable("Missing custom model weights")

    monkeypatch.setattr(main_module, "get_yolo_model", raise_unavailable)

    files = {"file": ("test.jpg", sample_image_bytes, "image/jpeg")}
    response = await async_client.post(endpoint, files=files)
    assert response.status_code == 503
    data = response.json()
    assert "Missing custom model weights" in data["detail"]


# --- 5. Model Resolution & Fallback Tests ---

def test_reports_model_loaded_from_fallback(monkeypatch):
    with TemporaryDirectory() as temp_dir:
        model_dir = Path(temp_dir)
        (model_dir / "yolov11m.pt").touch()
        dummy_model = object()

        monkeypatch.setattr(main_module, "MODELS_DIR", model_dir)
        monkeypatch.setattr(main_module, "YOLO", lambda path: dummy_model)

        model, model_id, model_name = get_yolo_model("yolov8m")

        assert model is dummy_model
        assert model_id == "yolov11m"
        assert model_name == "YOLOv11 Medium"


def test_raises_when_no_weights_exist(monkeypatch):
    with TemporaryDirectory() as temp_dir:
        monkeypatch.setattr(main_module, "MODELS_DIR", Path(temp_dir))
        with pytest.raises(ModelWeightsUnavailable):
            get_yolo_model("yolov11m")


# --- 6. Lifespan Startup and Shutdown Tests ---

async def test_lifespan_lifecycle():
    async with lifespan(app):
        # Startup pre-warms default model into _loaded_models if weights exist
        assert isinstance(_loaded_models, dict)
    # Shutdown cleans up loaded models
    assert len(_loaded_models) == 0


async def test_lifespan_warmup_error_suppression(monkeypatch):
    def broken_model_loader(name):
        raise RuntimeError("Simulated warm-up failure")

    monkeypatch.setattr(main_module, "get_yolo_model", broken_model_loader)

    # Lifespan should swallow warm-up failure during startup without aborting
    async with lifespan(app):
        pass
    assert len(_loaded_models) == 0
