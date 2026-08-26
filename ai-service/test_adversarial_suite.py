"""
Adversarial Stress and Edge-Case Test Suite for Littora AI Service.
Tests concurrency, thread safety, event loop responsiveness, input edge cases,
model fallback, schema conformance, and memory management.
"""

import asyncio
import io
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from tempfile import TemporaryDirectory

import pytest
from httpx import AsyncClient, ASGITransport
from PIL import Image
import torch

import main as main_module
from main import (
    app,
    get_yolo_model,
    _loaded_models,
    _inference_lock,
    _model_lock,
    MODELS_CONFIG,
    lifespan,
)
from severity import compute_score


def create_test_image(width=200, height=200, mode="RGB", color=(100, 150, 200), format="JPEG"):
    """Helper to create images in various formats and color modes."""
    img = Image.new(mode, (width, height), color=color if mode in ("RGB", "RGBA") else 128)
    buf = io.BytesIO()
    # JPEG doesn't support RGBA or P directly without conversion
    if format.upper() == "JPEG" and mode not in ("RGB", "L"):
        img = img.convert("RGB")
    img.save(buf, format=format)
    return buf.getvalue()


# ============================================================================
# 1. CONCURRENCY & THREAD SAFETY TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_high_concurrency_simultaneous_requests():
    """Fire 30 simultaneous requests across /detect, /predict, /health, and /models."""
    transport = ASGITransport(app=app)
    img_bytes = create_test_image(150, 150)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        async def detect_req(i: int):
            model = "yolov11m" if i % 2 == 0 else "yolov26s"
            endpoint = "/detect" if i % 3 == 0 else "/predict"
            files = {"file": (f"test_{i}.jpg", img_bytes, "image/jpeg")}
            data = {"model_name": model}
            res = await client.post(endpoint, files=files, data=data)
            return res.status_code, res.json()

        async def health_req():
            res = await client.get("/health")
            return res.status_code, res.json()

        async def models_req():
            res = await client.get("/models")
            return res.status_code, res.json()

        tasks = []
        for i in range(20):
            tasks.append(detect_req(i))
        for _ in range(5):
            tasks.append(health_req())
        for _ in range(5):
            tasks.append(models_req())

        results = await asyncio.gather(*tasks)

        # Verify all requests succeeded with 200 OK
        for status_code, data in results:
            assert status_code == 200, f"Request failed with status {status_code}: {data}"
            assert isinstance(data, dict)


@pytest.mark.asyncio
async def test_cold_start_concurrent_model_loading():
    """Simulate multiple concurrent requests hitting an empty model cache simultaneously."""
    main_module._loaded_models.clear()
    transport = ASGITransport(app=app)
    img_bytes = create_test_image(100, 100)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        async def make_request(model_name: str):
            files = {"file": ("cold.jpg", img_bytes, "image/jpeg")}
            return await client.post("/detect", files=files, data={"model_name": model_name})

        # Launch 10 simultaneous requests requesting both yolov11m and yolov26s on cold cache
        tasks = [make_request("yolov11m") for _ in range(5)] + [make_request("yolov26s") for _ in range(5)]
        responses = await asyncio.gather(*tasks)

        for res in responses:
            assert res.status_code == 200
            data = res.json()
            assert data["model_used"] in ("yolov11m", "yolov26s")

        # Verify models are properly cached without duplicates
        with _model_lock:
            assert "yolov11m" in _loaded_models or "yolov26s" in _loaded_models


def test_thread_safety_direct_inference_multithreaded():
    """Direct multi-threaded invocation of get_yolo_model and _sync_inference."""
    img = Image.new("RGB", (100, 100), color=(50, 100, 150))

    def run_worker(model_name: str):
        from main import _sync_inference
        res, model_id, model_name_out, names = _sync_inference(model_name, img)
        return model_id, names

    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(run_worker, "yolov11m" if i % 2 == 0 else "yolov26s") for i in range(16)]
        for f in futures:
            model_id, names = f.result()
            assert model_id in ("yolov11m", "yolov26s")
            assert isinstance(names, dict)


# ============================================================================
# 2. EVENT LOOP RESPONSIVENESS TEST
# ============================================================================

@pytest.mark.asyncio
async def test_event_loop_responsiveness_during_inference():
    """
    Verify that the FastAPI event loop is NOT blocked during inference.
    We run heavy concurrent detections while pulsing /health pings every 5ms.
    If event loop is blocked synchronously, ping latency would spike severely.
    """
    transport = ASGITransport(app=app)
    img_bytes = create_test_image(300, 300)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        ping_latencies = []
        stop_pinging = False

        async def health_pinger():
            while not stop_pinging:
                t0 = time.perf_counter()
                res = await client.get("/health")
                t1 = time.perf_counter()
                assert res.status_code == 200
                ping_latencies.append(t1 - t0)
                await asyncio.sleep(0.005)

        pinger_task = asyncio.create_task(health_pinger())

        # Run concurrent inference requests
        async def heavy_inference():
            files = {"file": ("heavy.jpg", img_bytes, "image/jpeg")}
            res = await client.post("/detect", files=files, data={"model_name": "yolov11m"})
            assert res.status_code == 200

        await asyncio.gather(*[heavy_inference() for _ in range(6)])

        stop_pinging = True
        await pinger_task

        assert len(ping_latencies) >= 3, "Pinger should have executed multiple times during inference"
        # Average ping latency should remain low (e.g. under 100ms in-memory)
        avg_ping = sum(ping_latencies) / len(ping_latencies)
        assert avg_ping < 0.20, f"Average health ping latency too high: {avg_ping:.4f}s (event loop blocked?)"


# ============================================================================
# 3. EDGE-CASE INPUT TESTING
# ============================================================================

@pytest.mark.asyncio
@pytest.mark.parametrize("mime", ["image/jpeg", "image/png", "image/webp"])
async def test_edge_case_zero_byte_files(mime: str):
    """Empty 0-byte uploads across multiple image MIME types -> 400."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("empty.bin", b"", mime)}
        res = await client.post("/detect", files=files)
        assert res.status_code == 400
        assert res.json()["detail"] == "Uploaded file is empty."


@pytest.mark.asyncio
@pytest.mark.parametrize("corrupted_payload, desc", [
    (b"\xFF\xD8\xFF\xE0" + b"\x00" * 10, "Truncated JPEG header"),
    (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + b"\x00" * 5, "Truncated PNG header"),
    (b"RIFF\x00\x00\x00\x00WEBPVP8 ", "Truncated WebP header"),
    (b"Not an image at all but labeled as image", "Plain text disguised as JPEG"),
    (b"\x00" * 1024, "Null bytes stream"),
    (b"\xFF\xD8\xFF" + b"\xDE\xAD\xBE\xEF" * 100, "Corrupted JPEG stream"),
])
async def test_edge_case_corrupted_image_bytes(corrupted_payload: bytes, desc: str):
    """Corrupted / truncated image bytes -> 400 Bad Request with decode error."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("corrupt.jpg", corrupted_payload, "image/jpeg")}
        res = await client.post("/detect", files=files)
        assert res.status_code == 400
        detail = res.json()["detail"]
        assert "Could not decode image file" in detail or "Failed to read image" in detail


@pytest.mark.asyncio
@pytest.mark.parametrize("mime_type", [
    "text/plain",
    "text/html",
    "application/json",
    "application/pdf",
    "application/octet-stream",
    "application/x-executable",
    "audio/mpeg",
    "video/mp4",
    "image/svg+xml",  # SVG is XML vector, PIL Image.open does not parse SVG
])
async def test_edge_case_non_image_or_unsupported_mime(mime_type: str):
    """Non-image or unsupported MIME types -> 400."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("test.doc", b"<svg></svg>" if "svg" in mime_type else b"fake-data", mime_type)}
        res = await client.post("/detect", files=files)
        assert res.status_code == 400
        data = res.json()
        assert "detail" in data


@pytest.mark.asyncio
@pytest.mark.parametrize("mode, format", [
    ("RGB", "JPEG"),
    ("RGB", "PNG"),
    ("RGB", "WEBP"),
    ("RGB", "BMP"),
    ("RGB", "TIFF"),
    ("RGBA", "PNG"),
    ("L", "JPEG"),        # Grayscale
    ("L", "PNG"),
    ("1", "PNG"),        # 1-bit monochrome
    ("P", "PNG"),        # 8-bit palette
])
async def test_edge_case_image_formats_and_modes(mode: str, format: str):
    """Verify various PIL image modes and container formats convert to RGB and run inference cleanly."""
    transport = ASGITransport(app=app)
    img_bytes = create_test_image(120, 120, mode=mode, format=format)
    mime = f"image/{format.lower()}"

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": (f"test.{format.lower()}", img_bytes, mime)}
        res = await client.post("/detect", files=files)
        assert res.status_code == 200
        data = res.json()
        assert "detections" in data
        assert "boxes" in data


@pytest.mark.asyncio
@pytest.mark.parametrize("width, height", [
    (1, 1),            # Minimum 1x1 pixel image
    (10, 10),
    (1, 500),          # Extreme aspect ratio tall
    (500, 1),          # Extreme aspect ratio wide
    (1024, 768),       # Standard photo size
    (2048, 2048),      # High-res square image
])
async def test_edge_case_extreme_dimensions(width: int, height: int):
    """Verify boundary image sizes and extreme aspect ratios."""
    transport = ASGITransport(app=app)
    img_bytes = create_test_image(width, height, format="PNG")

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("dim.png", img_bytes, "image/png")}
        res = await client.post("/detect", files=files)
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data["boxes"], list)
        for box in data["boxes"]:
            # Verify normalized coordinates are strictly bounded [0, 1]
            for coord in box["box_normalized"]:
                assert 0.0 <= coord <= 1.0


@pytest.mark.asyncio
@pytest.mark.parametrize("model_input, expected_model", [
    ("yolov11m", "yolov11m"),
    ("yolov26s", "yolov26s"),
    ("yolov8m", "yolov11m"),       # yolov8m best.pt is absent, falls back to yolov11m
    ("unknown_model_xyz", "yolov11m"), # unknown model falls back to yolov11m
    ("", "yolov11m"),             # empty string falls back to yolov11m
    ("../../../etc/passwd", "yolov11m"), # path traversal string falls back to yolov11m
    ("YOLOv11m", "yolov11m"),      # case variation falls back to yolov11m
])
async def test_edge_case_model_name_parameters(model_input: str, expected_model: str):
    """Test model_name input validation and fallback behavior."""
    transport = ASGITransport(app=app)
    img_bytes = create_test_image(100, 100)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("test.jpg", img_bytes, "image/jpeg")}
        data = {"model_name": model_input}
        res = await client.post("/detect", files=files, data=data)
        assert res.status_code == 200
        res_data = res.json()
        assert res_data["model_used"] == expected_model


@pytest.mark.asyncio
async def test_edge_case_oversized_payload():
    """Test large valid image payload (3000x3000 pixels)."""
    transport = ASGITransport(app=app)
    img_bytes = create_test_image(3000, 3000, format="JPEG")

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("large.jpg", img_bytes, "image/jpeg")}
        res = await client.post("/detect", files=files)
        assert res.status_code == 200
        data = res.json()
        assert "detections" in data


# ============================================================================
# 4. RESPONSE SCHEMA & MATHEMATICAL INVARIANTS
# ============================================================================

@pytest.mark.asyncio
async def test_response_contract_and_score_consistency():
    """Verify that returned scores and severity match compute_score exactly."""
    transport = ASGITransport(app=app)
    img_bytes = create_test_image(200, 200)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("test.jpg", img_bytes, "image/jpeg")}
        res = await client.post("/detect", files=files)
        assert res.status_code == 200
        data = res.json()

        # Contract keys check
        required_keys = {"detections", "total_waste", "pollution_score", "severity", "boxes", "model_used", "model_name"}
        assert required_keys.issubset(data.keys())

        # Mathematical consistency with compute_score
        expected_total, expected_score, expected_sev = compute_score(data["detections"])
        assert data["total_waste"] == expected_total
        assert data["pollution_score"] == expected_score
        assert data["severity"] == expected_sev

        # Total waste equals sum of detection values
        assert data["total_waste"] == sum(data["detections"].values())

        # Boxes structure verification
        for box in data["boxes"]:
            assert "class_name" in box
            assert "confidence" in box
            assert "box" in box
            assert "box_normalized" in box
            assert len(box["box"]) == 4
            assert len(box["box_normalized"]) == 4
            assert all(isinstance(c, (int, float)) for c in box["box"])
            assert all(0.0 <= c <= 1.0 for c in box["box_normalized"])


# ============================================================================
# 5. LIFESPAN & RESOURCE MANAGEMENT REPEATABILITY
# ============================================================================

@pytest.mark.asyncio
async def test_repeated_lifespan_cycles():
    """Ensure multiple consecutive lifespan startups and shutdowns don't leak or crash."""
    for _ in range(3):
        async with lifespan(app):
            # Model should be warm
            assert isinstance(_loaded_models, dict)
        # Model cache should be wiped on exit
        assert len(_loaded_models) == 0
