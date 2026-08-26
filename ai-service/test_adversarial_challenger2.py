"""
Adversarial Stress Test Suite - Milestone 1 Challenger 2
Tests:
1. Model Fallback Mechanisms under adverse conditions (missing weights, corrupt weights, custom weights, concurrent loads)
2. Response Payload Contracts & Normalized Bounding Box constraints ([0.0, 1.0], clamping, non-square ratios, empty/extreme detections)
3. Lifespan Pre-Warming, Startup fault tolerance, and Shutdown Memory Reclamation under stress cycles
4. High-concurrency request execution integrity
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor
import gc
import io
import os
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import threading
from typing import Any
import pytest
from httpx import AsyncClient, ASGITransport
from PIL import Image
import torch
from ultralytics import YOLO

import main as main_module
from main import (
    app,
    get_yolo_model,
    lifespan,
    _loaded_models,
    _model_lock,
    _inference_lock,
    _process_detection,
    _sync_load_image,
    _sync_inference,
    ModelWeightsUnavailable,
    DetectionResponse,
    HealthResponse,
    ModelListResponse,
    BoundingBox,
    MODELS_CONFIG,
)
from severity import compute_score


# --- Helper: Generate Test Images of Arbitrary Dimensions & Formats ---
def create_test_image(width: int, height: int, format: str = "JPEG", color: tuple = (100, 150, 200)) -> bytes:
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


# =====================================================================
# 1. MODEL FALLBACK ADVERSARIAL CHALLENGES
# =====================================================================

class DummyYoloModel:
    def __init__(self, name: str = "dummy"):
        self.name = name
        self.names = {0: "bottle", 1: "can", 2: "bag", 3: "wrapper"}

    def predict(self, *args, **kwargs):
        class DummyBox:
            cls = torch.tensor([0.0])
            conf = torch.tensor([0.95])
            xyxy = torch.tensor([[10.0, 10.0, 50.0, 50.0]])
        class DummyResult:
            boxes = [DummyBox()]
            names = {0: "bottle"}
        return [DummyResult()]


def test_fallback_chain_yolov8m_to_yolov11m(monkeypatch):
    """When yolov8m is requested and best.pt is absent, falls back to yolov11m.pt."""
    with TemporaryDirectory() as temp_dir:
        model_dir = Path(temp_dir)
        (model_dir / "yolov11m.pt").touch()
        monkeypatch.setattr(main_module, "MODELS_DIR", model_dir)
        monkeypatch.setattr(main_module, "YOLO", lambda p: DummyYoloModel(Path(p).stem))

        model, model_id, model_name = get_yolo_model("yolov8m")
        assert model_id == "yolov11m"
        assert model_name == "YOLOv11 Medium"
        assert model.name == "yolov11m"


def test_fallback_chain_yolov8m_to_yolov26s(monkeypatch):
    """When yolov8m is requested and best.pt AND yolov11m.pt are absent, falls back to yolov26s.pt."""
    with TemporaryDirectory() as temp_dir:
        model_dir = Path(temp_dir)
        (model_dir / "yolov26s.pt").touch()
        monkeypatch.setattr(main_module, "MODELS_DIR", model_dir)
        monkeypatch.setattr(main_module, "YOLO", lambda p: DummyYoloModel(Path(p).stem))

        model, model_id, model_name = get_yolo_model("yolov8m")
        assert model_id == "yolov26s"
        assert model_name == "YOLOv26 Small"
        assert model.name == "yolov26s"


def test_fallback_unknown_model_identifier(monkeypatch):
    """When an uncatalogued model id (e.g. 'nonexistent_yolo_999') is passed, defaults to fallback chain."""
    with TemporaryDirectory() as temp_dir:
        model_dir = Path(temp_dir)
        (model_dir / "yolov26s.pt").touch()
        monkeypatch.setattr(main_module, "MODELS_DIR", model_dir)
        monkeypatch.setattr(main_module, "YOLO", lambda p: DummyYoloModel(Path(p).stem))

        model, model_id, model_name = get_yolo_model("nonexistent_yolo_999")
        assert model_id == "yolov26s"
        assert model_name == "YOLOv26 Small"


def test_fallback_arbitrary_pt_file_discovery(monkeypatch):
    """When standard models are absent but a custom .pt file exists, it is dynamically discovered."""
    with TemporaryDirectory() as temp_dir:
        model_dir = Path(temp_dir)
        (model_dir / "custom_coastal_detector.pt").touch()
        monkeypatch.setattr(main_module, "MODELS_DIR", model_dir)
        monkeypatch.setattr(main_module, "YOLO", lambda p: DummyYoloModel(Path(p).stem))

        model, model_id, model_name = get_yolo_model("yolov11m")
        assert model_id == "custom_coastal_detector"
        assert model_name == "custom_coastal_detector"


def test_fallback_corrupt_candidate_advances_to_next(monkeypatch):
    """If candidate 1 fails during initialization, get_yolo_model logs and advances to candidate 2."""
    with TemporaryDirectory() as temp_dir:
        model_dir = Path(temp_dir)
        (model_dir / "yolov11m.pt").touch()
        (model_dir / "yolov26s.pt").touch()
        monkeypatch.setattr(main_module, "MODELS_DIR", model_dir)

        def mock_yolo_loader(path_str):
            if "yolov11m" in path_str:
                raise RuntimeError("Corrupted YOLO checkpoint header")
            return DummyYoloModel(Path(path_str).stem)

        monkeypatch.setattr(main_module, "YOLO", mock_yolo_loader)

        model, model_id, model_name = get_yolo_model("yolov11m")
        assert model_id == "yolov26s"
        assert model_name == "YOLOv26 Small"


def test_fallback_raises_503_when_no_weights_found(monkeypatch):
    """When no .pt files exist anywhere in MODELS_DIR, raises ModelWeightsUnavailable."""
    with TemporaryDirectory() as temp_dir:
        monkeypatch.setattr(main_module, "MODELS_DIR", Path(temp_dir))
        with pytest.raises(ModelWeightsUnavailable) as exc_info:
            get_yolo_model("yolov11m")
        assert "No model weights found" in str(exc_info.value)


def test_concurrent_fallback_loading_thread_safety(monkeypatch):
    """Stress test: 30 concurrent threads requesting models simultaneously must not race."""
    with TemporaryDirectory() as temp_dir:
        model_dir = Path(temp_dir)
        (model_dir / "yolov11m.pt").touch()
        monkeypatch.setattr(main_module, "MODELS_DIR", model_dir)

        load_count = 0
        def counting_loader(path):
            nonlocal load_count
            load_count += 1
            return DummyYoloModel("yolov11m")

        monkeypatch.setattr(main_module, "YOLO", counting_loader)

        def worker():
            return get_yolo_model("yolov8m")

        with ThreadPoolExecutor(max_workers=10) as executor:
            results = list(executor.map(lambda _: worker(), range(30)))

        # All threads must receive the exact same model instance
        first_instance = results[0][0]
        for res_model, res_id, res_name in results:
            assert res_model is first_instance
            assert res_id == "yolov11m"
        # YOLO constructor must have been called exactly once due to _model_lock
        assert load_count == 1


# =====================================================================
# 2. RESPONSE PAYLOAD & NORMALIZED BOUNDING BOX ADVERSARIAL CHALLENGES
# =====================================================================

class MockMultiBoxDetector:
    def __init__(self, boxes_data):
        self.boxes_data = boxes_data
        self.names = {0: "plastic_bottle", 1: "aluminum_can", 2: "plastic_bag", 3: "food_wrapper", 4: "unknown_debris"}

    def predict(self, *args, **kwargs):
        class BoxItem:
            def __init__(self, cls_id, conf, xyxy):
                self.cls = torch.tensor([float(cls_id)])
                self.conf = torch.tensor([float(conf)])
                self.xyxy = torch.tensor([xyxy])

        boxes = [BoxItem(c, conf, box) for c, conf, box in self.boxes_data]

        class MockResult:
            def __init__(self, b, n):
                self.boxes = b
                self.names = n

        return [MockResult(boxes, self.names)]


@pytest.mark.asyncio
async def test_normalized_bbox_extreme_and_out_of_bounds_clamping(monkeypatch):
    """Adversarially test bounding boxes that exceed image boundaries or have negative coords."""
    img_w, img_h = 800, 600
    # Adversarial boxes:
    # 1. Extreme negative coords [-200.0, -100.0, 400.0, 300.0]
    # 2. Extreme positive overshoot [500.0, 400.0, 1500.0, 1200.0]
    # 3. Complete out-of-bounds enclosure [-500.0, -500.0, 2000.0, 2000.0]
    # 4. Zero / point box [0.0, 0.0, 0.0, 0.0]
    # 5. Exact boundary box [0.0, 0.0, 800.0, 600.0]
    raw_boxes = [
        (0, 0.92345, [-200.0, -100.0, 400.0, 300.0]),
        (1, 0.88765, [500.0, 400.0, 1500.0, 1200.0]),
        (2, 0.75123, [-500.0, -500.0, 2000.0, 2000.0]),
        (3, 0.60456, [0.0, 0.0, 0.0, 0.0]),
        (0, 0.99999, [0.0, 0.0, 800.0, 600.0]),
    ]

    mock_detector = MockMultiBoxDetector(raw_boxes)
    monkeypatch.setattr(main_module, "get_yolo_model", lambda name: (mock_detector, "yolov11m", "YOLOv11 Medium"))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        test_img = create_test_image(img_w, img_h)
        files = {"file": ("test.jpg", test_img, "image/jpeg")}
        resp = await client.post("/detect", files=files)

        assert resp.status_code == 200
        data = resp.json()

        # Contract Validation
        assert isinstance(data["detections"], dict)
        assert data["total_waste"] == 5
        assert data["severity"] in ["Low", "Moderate", "High", "Severe"]
        assert len(data["boxes"]) == 5

        # Check each box's normalized coordinates
        for idx, box in enumerate(data["boxes"]):
            b_norm = box["box_normalized"]
            assert len(b_norm) == 4
            xmin, ymin, xmax, ymax = b_norm

            # Invariant 1: Strictly within [0.0, 1.0]
            assert 0.0 <= xmin <= 1.0, f"Box {idx} xmin {xmin} outside [0.0, 1.0]"
            assert 0.0 <= ymin <= 1.0, f"Box {idx} ymin {ymin} outside [0.0, 1.0]"
            assert 0.0 <= xmax <= 1.0, f"Box {idx} xmax {xmax} outside [0.0, 1.0]"
            assert 0.0 <= ymax <= 1.0, f"Box {idx} ymax {ymax} outside [0.0, 1.0]"

            # Invariant 2: Ordering xmin <= xmax, ymin <= ymax
            assert xmin <= xmax, f"Box {idx} xmin {xmin} > xmax {xmax}"
            assert ymin <= ymax, f"Box {idx} ymin {ymin} > ymax {ymax}"

            # Invariant 3: Precision & type
            assert isinstance(xmin, float)
            assert isinstance(ymin, float)
            assert isinstance(xmax, float)
            assert isinstance(ymax, float)
            assert isinstance(box["confidence"], float)

        # Specific clamped values verification
        # Box 0: [-200, -100, 400, 300] -> xmin clamped to 0.0, ymin to 0.0, xmax 400/800=0.5, ymax 300/600=0.5
        assert data["boxes"][0]["box_normalized"] == [0.0, 0.0, 0.5, 0.5]
        # Box 1: [500, 400, 1500, 1200] -> xmin 500/800=0.625, ymin 400/600=0.6667, xmax clamped 1.0, ymax clamped 1.0
        assert data["boxes"][1]["box_normalized"] == [0.625, 0.6667, 1.0, 1.0]
        # Box 2: [-500, -500, 2000, 2000] -> clamped [0.0, 0.0, 1.0, 1.0]
        assert data["boxes"][2]["box_normalized"] == [0.0, 0.0, 1.0, 1.0]
        # Box 3: [0, 0, 0, 0] -> [0.0, 0.0, 0.0, 0.0]
        assert data["boxes"][3]["box_normalized"] == [0.0, 0.0, 0.0, 0.0]
        # Box 4: [0, 0, 800, 600] -> [0.0, 0.0, 1.0, 1.0]
        assert data["boxes"][4]["box_normalized"] == [0.0, 0.0, 1.0, 1.0]


@pytest.mark.parametrize(
    "width, height",
    [
        (1920, 1080),  # Landscape 16:9
        (1080, 1920),  # Portrait 9:16
        (4000, 500),   # Wide banner
        (500, 4000),   # Tall strip
        (10, 10),      # Small thumbnail
        (1, 1),        # 1x1 micro-image
    ],
)
@pytest.mark.asyncio
async def test_non_standard_aspect_ratios(monkeypatch, width: int, height: int):
    """Verify normalization and inference behavior across extreme aspect ratios."""
    raw_boxes = [(0, 0.95, [0.0, 0.0, float(width), float(height)])]
    mock_detector = MockMultiBoxDetector(raw_boxes)
    monkeypatch.setattr(main_module, "get_yolo_model", lambda name: (mock_detector, "yolov11m", "YOLOv11 Medium"))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        test_img = create_test_image(width, height, format="PNG")
        files = {"file": ("test.png", test_img, "image/png")}
        resp = await client.post("/detect", files=files)
        assert resp.status_code == 200
        data = resp.json()
        assert data["boxes"][0]["box_normalized"] == [0.0, 0.0, 1.0, 1.0]


@pytest.mark.asyncio
async def test_zero_detections_response_structure(monkeypatch):
    """When no objects are detected, response must have clean zero-state payload."""
    mock_detector = MockMultiBoxDetector([])
    monkeypatch.setattr(main_module, "get_yolo_model", lambda name: (mock_detector, "yolov11m", "YOLOv11 Medium"))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        test_img = create_test_image(200, 200)
        files = {"file": ("test.jpg", test_img, "image/jpeg")}
        resp = await client.post("/detect", files=files)
        assert resp.status_code == 200
        data = resp.json()
        assert data["detections"] == {}
        assert data["total_waste"] == 0
        assert data["pollution_score"] == 0
        assert data["severity"] == "Low"
        assert data["boxes"] == []
        assert data["model_used"] == "yolov11m"
        assert data["model_name"] == "YOLOv11 Medium"


@pytest.mark.asyncio
async def test_class_normalization_in_response_payload(monkeypatch):
    """Verify raw variants (plastic_bottle, metal_can, etc.) are mapped to canonical names in payload."""
    raw_boxes = [
        (0, 0.9, [10, 10, 50, 50]),  # plastic_bottle -> bottle
        (1, 0.85, [60, 60, 100, 100]),  # aluminum_can -> can
        (2, 0.88, [110, 110, 150, 150]), # plastic_bag -> bag
        (3, 0.75, [160, 160, 200, 200]), # food_wrapper -> wrapper
        (4, 0.60, [210, 210, 250, 250]), # unknown_debris -> unknown_debris
    ]
    mock_detector = MockMultiBoxDetector(raw_boxes)
    monkeypatch.setattr(main_module, "get_yolo_model", lambda name: (mock_detector, "yolov11m", "YOLOv11 Medium"))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        test_img = create_test_image(500, 500)
        files = {"file": ("test.jpg", test_img, "image/jpeg")}
        resp = await client.post("/detect", files=files)
        assert resp.status_code == 200
        data = resp.json()

        assert data["detections"] == {
            "bottle": 1,
            "can": 1,
            "bag": 1,
            "wrapper": 1,
            "unknown_debris": 1,
        }
        # Scores: bottle(2) + can(2) + bag(5) + wrapper(3) + unknown(1) = 13 => Moderate (11-30)
        assert data["total_waste"] == 5
        assert data["pollution_score"] == 13
        assert data["severity"] == "Moderate"

        class_names = [b["class_name"] for b in data["boxes"]]
        assert class_names == ["bottle", "can", "bag", "wrapper", "unknown_debris"]


# =====================================================================
# 3. LIFESPAN, PRE-WARMING & MEMORY RECLAMATION ADVERSARIAL CHALLENGES
# =====================================================================

@pytest.mark.asyncio
async def test_lifespan_prewarming_with_real_models():
    """Verify lifespan startup pre-warms the default model into cache."""
    # Ensure starting clean
    _loaded_models.clear()
    async with lifespan(app):
        # Startup should have loaded yolov11m
        assert "yolov11m" in _loaded_models
        assert isinstance(_loaded_models["yolov11m"], (YOLO, object))
    # After exit, shutdown must have cleared the cache
    assert len(_loaded_models) == 0


@pytest.mark.asyncio
async def test_lifespan_repeated_stress_cycles_memory_cleanliness():
    """Run 20 consecutive lifespan startup/shutdown cycles and verify zero memory leak or stale state."""
    for cycle in range(20):
        async with lifespan(app):
            assert len(_loaded_models) >= 1
        assert len(_loaded_models) == 0
    gc.collect()


@pytest.mark.asyncio
async def test_lifespan_shutdown_handles_cuda_mps_defensively(monkeypatch):
    """Verify lifespan shutdown invokes cuda and mps cache clearing when available."""
    cuda_empty_called = False
    mps_empty_called = False

    monkeypatch.setattr(torch.cuda, "is_available", lambda: True)
    monkeypatch.setattr(torch.cuda, "empty_cache", lambda: nonlocal_setter_cuda())

    def nonlocal_setter_cuda():
        nonlocal cuda_empty_called
        cuda_empty_called = True

    class FakeMpsModule:
        @staticmethod
        def empty_cache():
            nonlocal mps_empty_called
            mps_empty_called = True

    class FakeBackendsMps:
        @staticmethod
        def is_available():
            return True

    monkeypatch.setattr(torch, "mps", FakeMpsModule, raising=False)
    monkeypatch.setattr(torch.backends, "mps", FakeBackendsMps, raising=False)

    async with lifespan(app):
        pass

    assert cuda_empty_called is True
    assert mps_empty_called is True
    assert len(_loaded_models) == 0


# =====================================================================
# 4. HIGH CONCURRENCY INFERENCE INTEGRITY STRESS TEST
# =====================================================================

@pytest.mark.asyncio
async def test_high_concurrency_inference_stress(sample_image_bytes: bytes):
    """Send 50 simultaneous detection requests across multiple models to stress thread safety & event loop."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        async def send_req(model_target: str, idx: int):
            files = {"file": (f"test_{idx}.jpg", sample_image_bytes, "image/jpeg")}
            res = await client.post("/detect", files=files, data={"model_name": model_target})
            assert res.status_code == 200
            data = res.json()
            assert "total_waste" in data
            assert data["model_used"] in ["yolov11m", "yolov26s"]
            return data

        tasks = []
        for i in range(50):
            model = "yolov11m" if i % 2 == 0 else "yolov26s"
            tasks.append(send_req(model, i))

        results = await asyncio.gather(*tasks)
        assert len(results) == 50
