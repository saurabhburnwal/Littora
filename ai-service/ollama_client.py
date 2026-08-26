"""
Asynchronous Ollama LLM Client for Littora AI Microservice.
Communicates with local Ollama daemon (targeting `ministral-3:3b`) over HTTP.
Provides timeout handling, JSON format enforcement, liveness probes, and graceful failure.
"""

import json
import logging
import os
import time
from typing import Any, Dict, Optional, Tuple

import httpx

logger = logging.getLogger("ai_service.ollama")

# --- Configuration with Environment Variable Defaults ---
OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "ministral-3:3b")
OLLAMA_TIMEOUT_SECONDS: float = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "120.0"))
OLLAMA_ENABLED: bool = os.getenv("OLLAMA_ENABLED", "true").strip().lower() in ("true", "1", "yes")

_cached_liveness: Optional[Tuple[bool, str]] = None
_cached_liveness_timestamp: float = 0.0
_LIVENESS_CACHE_TTL_SECONDS: float = 5.0


async def check_liveness(timeout: float = 1.0, force_refresh: bool = False) -> Tuple[bool, str]:
    """
    Asynchronously checks if the local Ollama service is reachable and responsive.
    Results are cached with a 5-second TTL to ensure sub-millisecond response times
    for high-frequency health probes.

    Returns:
        Tuple[bool, str]: (is_available, status_string)
        status_string is one of: 'connected', 'unreachable', or 'disabled'
    """
    global _cached_liveness, _cached_liveness_timestamp

    if not OLLAMA_ENABLED:
        return False, "disabled"

    now = time.time()
    if not force_refresh and _cached_liveness is not None:
        if (now - _cached_liveness_timestamp) < _LIVENESS_CACHE_TTL_SECONDS:
            return _cached_liveness

    url = f"{OLLAMA_BASE_URL}/api/tags"
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                _cached_liveness = (True, "connected")
                _cached_liveness_timestamp = now
                return _cached_liveness
            logger.warning(f"Ollama health probe returned status {resp.status_code}")
            _cached_liveness = (False, "unreachable")
            _cached_liveness_timestamp = now
            return _cached_liveness
    except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout, httpx.HTTPError) as err:
        logger.debug(f"Ollama service unreachable at {url}: {err}")
        _cached_liveness = (False, "unreachable")
        _cached_liveness_timestamp = now
        return _cached_liveness
    except Exception as err:
        logger.debug(f"Unexpected error probing Ollama service at {url}: {err}")
        _cached_liveness = (False, "unreachable")
        _cached_liveness_timestamp = now
        return _cached_liveness


async def generate(
    prompt: str,
    system_prompt: Optional[str] = None,
    json_format: bool = True,
    temperature: float = 0.2,
    top_p: float = 0.9,
    model: Optional[str] = None,
    timeout: Optional[float] = None,
) -> Optional[Dict[str, Any]]:
    """
    Asynchronously generates text or structured JSON from the Ollama LLM.

    Args:
        prompt: The user instruction and data context.
        system_prompt: Optional persona/system directive.
        json_format: If True, instructs Ollama to enforce strict JSON output.
        temperature: Sampling temperature (default 0.2 for deterministic analytical output).
        top_p: Nucleus sampling probability (default 0.9).
        model: Specific model tag to override OLLAMA_MODEL.
        timeout: Optional custom timeout in seconds (defaults to OLLAMA_TIMEOUT_SECONDS).

    Returns:
        Optional[Dict[str, Any]]: Parsed JSON dictionary if successful, or None if Ollama
        is offline, times out, or returns invalid/unparseable content.
    """
    if not OLLAMA_ENABLED:
        logger.info("Ollama LLM generation skipped: OLLAMA_ENABLED is false")
        return None

    request_timeout = timeout if timeout is not None else OLLAMA_TIMEOUT_SECONDS
    target_model = model or OLLAMA_MODEL
    url = f"{OLLAMA_BASE_URL}/api/generate"

    payload: Dict[str, Any] = {
        "model": target_model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": temperature,
            "top_p": top_p,
        },
    }

    if system_prompt:
        payload["system"] = system_prompt

    if json_format:
        payload["format"] = "json"

    try:
        async with httpx.AsyncClient(timeout=request_timeout) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                logger.warning(
                    f"Ollama API returned HTTP {resp.status_code} for model '{target_model}': {resp.text}"
                )
                return None

            data = resp.json()
            raw_response = data.get("response")

            if not raw_response:
                logger.warning("Ollama API returned empty response body")
                return None

            if isinstance(raw_response, dict):
                return raw_response

            if json_format and isinstance(raw_response, str):
                # Strip markdown code fences that some models add despite format=json
                cleaned = raw_response.strip()
                if cleaned.startswith("```"):
                    # Remove opening fence (```json or ```)
                    cleaned = cleaned.split("\n", 1)[-1] if "\n" in cleaned else cleaned[3:]
                    # Remove closing fence
                    if cleaned.rstrip().endswith("```"):
                        cleaned = cleaned.rstrip()[:-3].rstrip()
                try:
                    parsed = json.loads(cleaned)
                    if isinstance(parsed, dict):
                        return parsed
                    logger.warning(f"Ollama JSON output is not a JSON object: {type(parsed)}")
                    return None
                except json.JSONDecodeError as decode_err:
                    logger.warning(f"Failed to parse Ollama response as JSON: {decode_err}")
                    return None

            # Non-JSON or string return
            return {"response": raw_response}

    except (httpx.ConnectError, httpx.ConnectTimeout) as conn_err:
        logger.warning(f"Connection to Ollama failed ({OLLAMA_BASE_URL}): {conn_err}")
        return None
    except (httpx.ReadTimeout, httpx.WriteTimeout, httpx.PoolTimeout) as timeout_err:
        logger.warning(f"Ollama request timed out after {request_timeout}s: {timeout_err}")
        return None
    except httpx.HTTPStatusError as http_err:
        logger.warning(f"Ollama HTTP status error: {http_err}")
        return None
    except Exception as general_err:
        logger.warning(f"Unexpected error communicating with Ollama: {general_err}")
        return None
