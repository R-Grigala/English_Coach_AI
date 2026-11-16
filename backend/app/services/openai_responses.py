"""Small, privacy-conscious client for OpenAI's Responses API."""

import json
import logging
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from flask import current_app

from app.services.openai_credentials import get_api_key

logger = logging.getLogger(__name__)
RESPONSES_URL = "https://api.openai.com/v1/responses"


class AIServiceError(Exception):
    def __init__(self, code, message, status=502):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


def create_response(instructions, input_content, schema_name, schema, max_output_tokens=1800):
    """Call Responses API, enforce JSON schema and log aggregate usage only."""
    try:
        api_key = get_api_key()
    except Exception as error:
        logger.error("OpenAI credential store is unavailable (%s)", type(error).__name__)
        raise AIServiceError("integration_unavailable", "OpenAI credentials are unavailable", 503) from None
    if not api_key:
        raise AIServiceError("integration_not_configured", "Connect an OpenAI API key first", 503)

    payload = {
        "model": current_app.config["OPENAI_MODEL"],
        "instructions": instructions,
        "input": input_content,
        "store": False,
        "max_output_tokens": max_output_tokens,
        "text": {"format": {"type": "json_schema", "name": schema_name, "strict": True, "schema": _provider_schema(schema)}},
    }
    request = Request(
        RESPONSES_URL,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    started = time.perf_counter()
    try:
        with urlopen(request, timeout=current_app.config["OPENAI_REQUEST_TIMEOUT"]) as response:
            result = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        status = error.code
        if status == 401:
            raise AIServiceError("openai_authentication_failed", "The saved OpenAI API key was rejected", 503) from None
        if status == 429:
            raise AIServiceError("openai_rate_limited", "OpenAI rate limit or quota was reached; try again later", 429) from None
        if status in (400, 404, 422):
            raise AIServiceError("openai_request_rejected", "OpenAI could not process this request; check the configured model and input", 502) from None
        raise AIServiceError("openai_unavailable", "OpenAI is temporarily unavailable", 502) from None
    except (URLError, TimeoutError, OSError):
        raise AIServiceError("openai_unavailable", "Could not reach OpenAI; try again later", 502) from None
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise AIServiceError("invalid_provider_response", "OpenAI returned an unreadable response", 502) from None
    finally:
        elapsed_ms = round((time.perf_counter() - started) * 1000)

    if result.get("status") != "completed":
        raise AIServiceError("incomplete_provider_response", "OpenAI did not complete the response; try a shorter request", 502)
    output_text = None
    refused = False
    for item in result.get("output", []):
        if item.get("type") != "message":
            continue
        for part in item.get("content", []):
            refused = refused or part.get("type") == "refusal"
            if part.get("type") == "output_text":
                output_text = part.get("text")
    if refused:
        raise AIServiceError("request_refused", "OpenAI could not fulfill this learning request", 422)
    if not output_text:
        raise AIServiceError("empty_provider_response", "OpenAI returned no structured content", 502)
    try:
        structured = json.loads(output_text)
        _validate_json_schema(structured, schema)
    except (json.JSONDecodeError, ValueError, TypeError):
        raise AIServiceError("invalid_structured_response", "OpenAI returned content that did not match the required format", 502) from None

    usage = result.get("usage") or {}
    input_tokens = int(usage.get("input_tokens") or 0)
    output_tokens = int(usage.get("output_tokens") or 0)
    input_price = current_app.config["OPENAI_INPUT_PRICE_PER_MILLION"]
    output_price = current_app.config["OPENAI_OUTPUT_PRICE_PER_MILLION"]
    cost = round((input_tokens * input_price + output_tokens * output_price) / 1_000_000, 8) if input_price > 0 and output_price > 0 else None
    logger.info(
        "openai_response model=%s response_id=%s input_tokens=%d output_tokens=%d latency_ms=%d estimated_cost_usd=%s",
        current_app.config["OPENAI_MODEL"], result.get("id", "unknown"), input_tokens, output_tokens, elapsed_ms,
        f"{cost:.8f}" if cost is not None else "not_configured",
    )
    return structured


def _validate_json_schema(value, schema):
    """Validate the strict schema locally as a second boundary check."""
    kind = schema.get("type")
    if kind == "object":
        if not isinstance(value, dict) or set(value) != set(schema.get("required", [])):
            raise ValueError("invalid object fields")
        properties = schema.get("properties", {})
        if set(value) - set(properties):
            raise ValueError("unexpected object fields")
        for key, child in properties.items():
            _validate_json_schema(value[key], child)
    elif kind == "array":
        if not isinstance(value, list):
            raise ValueError("invalid array")
        if len(value) < schema.get("minItems", 0) or len(value) > schema.get("maxItems", 1000):
            raise ValueError("invalid array length")
        for item in value:
            _validate_json_schema(item, schema["items"])
    elif kind == "string":
        if not isinstance(value, str) or len(value) < schema.get("x-minLength", 0) or len(value) > schema.get("x-maxLength", 1_000_000):
            raise ValueError("invalid string")
        if "enum" in schema and value not in schema["enum"]:
            raise ValueError("invalid enum")
    elif kind == "integer":
        if type(value) is not int:
            raise ValueError("invalid integer")
    elif kind == "number":
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError("invalid number")
    elif kind == "boolean" and type(value) is not bool:
        raise ValueError("invalid boolean")


def _provider_schema(schema):
    """Remove local-only validation metadata unsupported by JSON Schema subset."""
    if isinstance(schema, dict):
        return {key: _provider_schema(value) for key, value in schema.items() if not key.startswith("x-")}
    if isinstance(schema, list):
        return [_provider_schema(value) for value in schema]
    return schema
