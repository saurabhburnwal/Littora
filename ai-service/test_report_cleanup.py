"""
Pytest suite for Littora AI Microservice:
- Ollama Async Client (`ministral-3:3b`), timeouts, JSON parsing, and liveness checks
- Report Generation (`POST /report/generate`) across Daily, Weekly, Monthly, and Custom periods
- Cleanup Recommendations (`POST /cleanup/recommendations`) with priority tiers and equipment
- Robust Deterministic Statistical Fallback Engine for offline/timeout/malformed states
- Health Monitoring (`GET /health`) with Ollama connectivity reporting
"""

import json
from unittest.mock import AsyncMock, patch

import httpx
from httpx import AsyncClient, Response
import pytest

import cleanup_recommender
import main as main_module
import ollama_client
import report_generator
from schemas import (
    CleanupRecommendationItem,
    CleanupRequest,
    CleanupResponse,
    DateRange,
    LocationTelemetry,
    ReportRequest,
    ReportResponse,
    ReportTelemetry,
)

# Module-level capture of original httpx.AsyncClient methods
_orig_post = httpx.AsyncClient.post
_orig_get = httpx.AsyncClient.get


# =====================================================================
# Fixtures for Mocking Ollama API Responses
# =====================================================================

@pytest.fixture
def mock_ollama_report_success():
    mock_payload = {
        "model": "ministral-3:3b",
        "created_at": "2026-08-26T17:30:00Z",
        "response": json.dumps({
            "executive_summary": "Ollama LLM synthesized executive summary: Coastal zones exhibit moderate plastic debris accumulation.",
            "risk_assessment": "Ollama LLM risk assessment: Intertidal habitats face localized microplastic fragmentation hazards.",
            "actionable_takeaways": [
                "Deploy volunteer cleanup teams to Juhu and Versova sectors.",
                "Install solar-powered compactor bins near beach promenade.",
                "Increase daily drone surveillance along tidal swash line.",
            ],
            "impact_analysis": "Threat Level: Moderate | Primary Contaminant: PET Plastic | Patrol Frequency: Bi-weekly.",
            "priority_actions": [
                "Schedule immediate debris containment in high-density swash zones.",
                "Organize volunteer sorting drive this weekend.",
            ],
        }),
        "done": True,
    }

    async def _mock_post(self, url, *args, **kwargs):
        if "11434" in str(url) or "/api/" in str(url):
            return Response(status_code=200, json=mock_payload)
        return await _orig_post(self, url, *args, **kwargs)

    with patch.object(httpx.AsyncClient, "post", new=_mock_post):
        yield


@pytest.fixture
def mock_ollama_cleanup_success():
    mock_payload = {
        "model": "ministral-3:3b",
        "created_at": "2026-08-26T17:30:00Z",
        "response": json.dumps({
            "recommendations": [
                {
                    "location": "Juhu Beach",
                    "priority_tier": "Tier 1 - Critical",
                    "urgency": "Immediate",
                    "severity": "Severe",
                    "action": "Organize urgent cleanup drive within 48 hours & deploy waste bins.",
                    "rationale": "Critical pollution score detected (72.5 pts, 65 items). Immediate intervention required.",
                    "estimated_volunteers": 25,
                    "estimated_duration_hours": 4,
                    "equipment": ["Heavy-duty gloves", "Trash grabbers", "Plastic sorting bags", "First aid kit"],
                    "targeted_zones": ["High-tide waterline", "Rocky crevices & embankment"],
                    "suggested_schedule": "Immediate (Within 48 hours)",
                }
            ]
        }),
        "done": True,
    }

    async def _mock_post(self, url, *args, **kwargs):
        if "11434" in str(url) or "/api/" in str(url):
            return Response(status_code=200, json=mock_payload)
        return await _orig_post(self, url, *args, **kwargs)

    with patch.object(httpx.AsyncClient, "post", new=_mock_post):
        yield


@pytest.fixture
def mock_ollama_offline():
    async def _mock_post(self, url, *args, **kwargs):
        if "11434" in str(url) or "/api/" in str(url):
            raise httpx.ConnectError("Connection refused: Ollama daemon not running at localhost:11434")
        return await _orig_post(self, url, *args, **kwargs)

    with patch.object(httpx.AsyncClient, "post", new=_mock_post):
        yield


@pytest.fixture
def mock_ollama_timeout():
    async def _mock_post(self, url, *args, **kwargs):
        if "11434" in str(url) or "/api/" in str(url):
            raise httpx.ReadTimeout("Ollama inference timed out after 30.0s")
        return await _orig_post(self, url, *args, **kwargs)

    with patch.object(httpx.AsyncClient, "post", new=_mock_post):
        yield


@pytest.fixture
def mock_ollama_malformed_json():
    mock_payload = {
        "model": "ministral-3:3b",
        "response": "This is raw unformatted text without valid JSON structure {corrupt",
        "done": True,
    }

    async def _mock_post(self, url, *args, **kwargs):
        if "11434" in str(url) or "/api/" in str(url):
            return Response(status_code=200, json=mock_payload)
        return await _orig_post(self, url, *args, **kwargs)

    with patch.object(httpx.AsyncClient, "post", new=_mock_post):
        yield


# =====================================================================
# 1. Ollama Client Unit Tests
# =====================================================================

async def test_ollama_liveness_connected():
    async def _mock_get(self, url, *args, **kwargs):
        if "11434" in str(url) or "/api/" in str(url):
            return Response(status_code=200, json={"models": [{"name": "ministral-3:3b"}]})
        return await _orig_get(self, url, *args, **kwargs)

    with patch.object(httpx.AsyncClient, "get", new=_mock_get):
        is_alive, status_str = await ollama_client.check_liveness(force_refresh=True)
        assert is_alive is True
        assert status_str == "connected"


async def test_ollama_liveness_unreachable():
    async def _mock_get(self, url, *args, **kwargs):
        if "11434" in str(url) or "/api/" in str(url):
            raise httpx.ConnectError("Connection refused")
        return await _orig_get(self, url, *args, **kwargs)

    with patch.object(httpx.AsyncClient, "get", new=_mock_get):
        is_alive, status_str = await ollama_client.check_liveness(force_refresh=True)
        assert is_alive is False
        assert status_str == "unreachable"


async def test_ollama_liveness_disabled(monkeypatch):
    monkeypatch.setattr(ollama_client, "OLLAMA_ENABLED", False)
    is_alive, status_str = await ollama_client.check_liveness(force_refresh=True)
    assert is_alive is False
    assert status_str == "disabled"


async def test_ollama_generate_disabled(monkeypatch):
    monkeypatch.setattr(ollama_client, "OLLAMA_ENABLED", False)
    res = await ollama_client.generate("Test prompt")
    assert res is None


async def test_ollama_generate_timeout(mock_ollama_timeout):
    res = await ollama_client.generate("Test prompt")
    assert res is None


async def test_ollama_generate_connect_error(mock_ollama_offline):
    res = await ollama_client.generate("Test prompt")
    assert res is None


# =====================================================================
# 2. Report Generation Endpoints & Fallback Tests
# =====================================================================

@pytest.mark.parametrize("period", ["daily", "weekly", "monthly", "custom"])
async def test_report_generate_endpoint_ollama_success(
    async_client: AsyncClient, mock_ollama_report_success, period: str
):
    payload = {
        "period": period,
        "date_range": {"start": "2026-08-01T00:00:00Z", "end": "2026-08-26T23:59:59Z"},
        "location_filter": "Juhu Beach",
        "telemetry": {
            "total_scans": 14,
            "total_waste_items": 168,
            "avg_pollution_score": 42.5,
            "severity_breakdown": {"Low": 2, "Moderate": 6, "High": 5, "Severe": 1},
            "top_categories": {"Plastic": 90, "Glass": 35, "Metal": 25, "Wrapper": 18},
        },
    }

    response = await async_client.post("/report/generate", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["period"] == period
    assert data["source"] == "ollama_ministral-3:3b"
    assert "executive_summary" in data
    assert "Ollama LLM synthesized" in data["executive_summary"]
    assert "risk_assessment" in data
    assert isinstance(data["actionable_takeaways"], list)
    assert len(data["actionable_takeaways"]) > 0
    assert "generated_at" in data
    assert "raw_text" in data


@pytest.mark.parametrize("period", ["daily", "weekly", "monthly", "custom"])
async def test_report_generate_endpoint_offline_fallback(
    async_client: AsyncClient, mock_ollama_offline, period: str
):
    payload = {
        "period": period,
        "date_range": {"start": "2026-08-20T00:00:00Z", "end": "2026-08-26T23:59:59Z"},
        "location_filter": "Versova Beach",
        "telemetry": {
            "total_scans": 10,
            "total_waste_items": 120,
            "avg_pollution_score": 55.0,
            "severity_breakdown": {"Low": 1, "Moderate": 2, "High": 5, "Severe": 2},
            "top_categories": {"bag": 60, "wrapper": 40, "bottle": 20},
        },
    }

    response = await async_client.post("/report/generate", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["period"] == period
    assert data["source"] == "rule_based_fallback"
    assert "executive_summary" in data
    assert "Littora Environmental Audit" in data["executive_summary"]
    assert "risk_assessment" in data
    assert "Threat Tier: High" in data["risk_assessment"] or "Threat Tier: Severe" in data["risk_assessment"]
    assert isinstance(data["actionable_takeaways"], list)
    assert len(data["actionable_takeaways"]) >= 3
    assert "raw_text" in data
    assert "LITTORA COASTAL MONITORING SYSTEM" in data["raw_text"]


async def test_report_generate_timeout_fallback(
    async_client: AsyncClient, mock_ollama_timeout
):
    payload = {
        "period": "monthly",
        "telemetry": {
            "total_scans": 5,
            "total_waste_items": 30,
            "avg_pollution_score": 15.0,
            "severity_breakdown": {"Low": 4, "Moderate": 1, "High": 0, "Severe": 0},
            "top_categories": {"bottle": 15, "can": 15},
        },
    }

    response = await async_client.post("/report/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "rule_based_fallback"
    assert "executive_summary" in data
    assert data["period"] == "monthly"


async def test_report_generate_malformed_json_fallback(
    async_client: AsyncClient, mock_ollama_malformed_json
):
    payload = {
        "period": "daily",
        "telemetry": {
            "total_scans": 2,
            "total_waste_items": 10,
            "avg_pollution_score": 8.0,
            "severity_breakdown": {"Low": 2, "Moderate": 0, "High": 0, "Severe": 0},
        },
    }

    response = await async_client.post("/report/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "rule_based_fallback"
    assert data["period"] == "daily"


async def test_report_generate_empty_telemetry(
    async_client: AsyncClient, mock_ollama_offline
):
    """Empty or zero telemetry should gracefully generate fallback without zero-division or errors."""
    payload = {
        "period": "custom",
        "telemetry": {},
    }

    response = await async_client.post("/report/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "rule_based_fallback"
    assert "executive_summary" in data
    assert "0 coastal scan(s)" in data["executive_summary"]


# =====================================================================
# 3. Cleanup Recommendations Endpoints & Fallback Tests
# =====================================================================

async def test_cleanup_recommendations_ollama_success(
    async_client: AsyncClient, mock_ollama_cleanup_success
):
    payload = {
        "locations": [
            {
                "location": "Juhu Beach",
                "scans": 5,
                "pollution_score": 72.5,
                "severity": "Severe",
                "top_waste": "Plastic",
                "categories": {"Plastic": 45, "Glass": 20},
            }
        ]
    }

    response = await async_client.post("/cleanup/recommendations", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["source"] == "ollama_ministral-3:3b"
    assert len(data["recommendations"]) == 1
    rec = data["recommendations"][0]
    assert rec["location"] == "Juhu Beach"
    assert rec["priority"] == "high"
    assert rec["priority_tier"] == "Tier 1 - Critical"
    assert rec["urgency"] == "Immediate"
    assert rec["estimated_volunteers"] == 25
    assert isinstance(rec["equipment"], list)
    assert "Heavy-duty gloves" in rec["equipment"]
    assert isinstance(rec["targeted_zones"], list)


async def test_cleanup_recommendations_offline_fallback(
    async_client: AsyncClient, mock_ollama_offline
):
    payload = {
        "locations": [
            {
                "location": "Marine Drive",
                "scans": 8,
                "pollution_score": 68.0,
                "severity": "Severe",
                "top_waste": "Glass",
                "categories": {"glass_bottle": 30, "bag": 20},
            },
            {
                "location": "Girgaon Chowpatty",
                "scans": 3,
                "pollution_score": 24.0,
                "severity": "Moderate",
                "top_waste": "Wrapper",
                "categories": {"food_wrapper": 15},
            },
            {
                "location": "Aksa Beach",
                "scans": 2,
                "pollution_score": 5.0,
                "severity": "Low",
                "top_waste": "Can",
                "categories": {"can": 2},
            },
        ]
    }

    response = await async_client.post("/cleanup/recommendations", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["source"] == "rule_based_fallback"
    assert len(data["recommendations"]) == 3

    # Check sorting: High priority first
    assert data["recommendations"][0]["priority"] == "high"
    assert data["recommendations"][0]["location"] == "Marine Drive"
    assert "Cut-resistant puncture-proof gloves" in data["recommendations"][0]["equipment"]

    assert data["recommendations"][1]["priority"] == "medium"
    assert data["recommendations"][1]["location"] == "Girgaon Chowpatty"

    assert data["recommendations"][2]["priority"] == "low"
    assert data["recommendations"][2]["location"] == "Aksa Beach"

    assert data["high_priority_count"] == 1
    assert data["total_hotspots"] == 3
    assert len(data["suggested_schedule"]) >= 2


async def test_cleanup_recommendations_empty_locations(
    async_client: AsyncClient, mock_ollama_offline
):
    payload = {"locations": []}
    response = await async_client.post("/cleanup/recommendations", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["recommendations"] == []
    assert data["total_hotspots"] == 0
    assert data["high_priority_count"] == 0


async def test_cleanup_recommendations_timeout_fallback(
    async_client: AsyncClient, mock_ollama_timeout
):
    payload = {
        "locations": [
            {
                "location": "Dadra Beach",
                "scans": 4,
                "pollution_score": 45.0,
                "severity": "High",
                "categories": {"bottle": 20, "bag": 15},
            }
        ]
    }

    response = await async_client.post("/cleanup/recommendations", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "rule_based_fallback"
    assert len(data["recommendations"]) == 1
    assert data["recommendations"][0]["priority"] == "high"


# =====================================================================
# 4. Enhanced Health Check Endpoint Tests
# =====================================================================

async def test_health_endpoint_ollama_connected(async_client: AsyncClient):
    async def _mock_get(self, url, *args, **kwargs):
        if "11434" in str(url) or "/api/" in str(url):
            return Response(status_code=200, json={"models": [{"name": "ministral-3:3b"}]})
        return await _orig_get(self, url, *args, **kwargs)

    with patch.object(httpx.AsyncClient, "get", new=_mock_get):
        # Force cache refresh
        await ollama_client.check_liveness(force_refresh=True)
        response = await async_client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["ollama_status"] == "connected"
        assert data["ollama_model"] == "ministral-3:3b"
        assert "http://localhost:11434" in data["ollama_url"]


async def test_health_endpoint_ollama_unreachable(async_client: AsyncClient):
    async def _mock_get(self, url, *args, **kwargs):
        if "11434" in str(url) or "/api/" in str(url):
            raise httpx.ConnectError("Connection refused")
        return await _orig_get(self, url, *args, **kwargs)

    with patch.object(httpx.AsyncClient, "get", new=_mock_get):
        await ollama_client.check_liveness(force_refresh=True)
        response = await async_client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["ollama_status"] == "unreachable"


async def test_health_endpoint_ollama_disabled(async_client: AsyncClient, monkeypatch):
    monkeypatch.setattr(ollama_client, "OLLAMA_ENABLED", False)
    await ollama_client.check_liveness(force_refresh=True)
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["ollama_status"] == "disabled"
