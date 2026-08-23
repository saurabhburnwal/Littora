"""
Pytest suite for AI Service (severity scoring, model loading, & FastAPI async endpoints).
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
    list_models,
    MODELS_CONFIG,
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
    ],
)
def test_compute_score_scenarios(
    detections, expected_total, expected_score, expected_severity
):
    total, score, severity = compute_score(detections)
    assert total == expected_total
    assert score == expected_score
    assert severity == expected_severity


# --- 2. Direct Function Tests ---

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


# --- 3. Async FastAPI HTTP Endpoint Tests ---

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


async def test_predict_endpoint_invalid_image(async_client: AsyncClient):
    files = {"file": ("corrupt.jpg", b"not-an-image-data", "image/jpeg")}
    response = await async_client.post("/predict", files=files)
    assert response.status_code == 400


# --- 4. Model Resolution & Fallback Tests ---

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
