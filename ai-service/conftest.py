import io
import pytest
from httpx import AsyncClient, ASGITransport
from PIL import Image
import main as main_module
from main import app


@pytest.fixture(autouse=True)
def clear_loaded_models():
    """Ensure clean model cache before and after each test."""
    main_module._loaded_models.clear()
    yield
    main_module._loaded_models.clear()


@pytest.fixture
async def async_client():
    """Asynchronous HTTP client calling FastAPI application in-memory via ASGITransport."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
def sample_image_bytes():
    """Generates a small in-memory 100x100 RGB JPEG image for endpoint tests."""
    img = Image.new("RGB", (100, 100), color=(73, 109, 137))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()
