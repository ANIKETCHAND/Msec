"""Centralized Error Handling for MediShield FastAPI Application.

Transforms domain exceptions and framework errors into uniform,
structured error responses without exposing internal stack traces.
"""

import uuid
from datetime import datetime, timezone
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import MediShieldException


def format_error_response(
    code: str,
    message: str,
    status_code: int,
    request: Request,
    details: dict = None,
) -> JSONResponse:
    """Produces standardized error JSON envelope with backward-compatible detail key."""
    request_id = getattr(request.state, "request_id", None) or f"REQ-{uuid.uuid4().hex[:8].upper()}"
    timestamp = datetime.now(timezone.utc).isoformat()

    content = {
        "detail": message,  # Preserves Starlette/FastAPI standard contract
        "error": {
            "code": code,
            "message": message,
            "status_code": status_code,
            "timestamp": timestamp,
            "request_id": request_id,
            "details": jsonable_encoder(details) if details else {},
        }
    }
    return JSONResponse(status_code=status_code, content=content)


def register_error_handlers(app: FastAPI) -> None:
    """Registers all centralized exception handlers on the FastAPI application."""

    @app.exception_handler(MediShieldException)
    async def medishield_exception_handler(request: Request, exc: MediShieldException):
        return format_error_response(
            code=exc.code,
            message=exc.message,
            status_code=exc.status_code,
            request=request,
            details=exc.details,
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        code_map = {
            status.HTTP_401_UNAUTHORIZED: "UNAUTHORIZED",
            status.HTTP_403_FORBIDDEN: "FORBIDDEN",
            status.HTTP_404_NOT_FOUND: "NOT_FOUND",
            status.HTTP_409_CONFLICT: "CONFLICT",
            status.HTTP_422_UNPROCESSABLE_ENTITY: "VALIDATION_ERROR",
        }
        code = code_map.get(exc.status_code, "HTTP_ERROR")
        return format_error_response(
            code=code,
            message=str(exc.detail),
            status_code=exc.status_code,
            request=request,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        first_error = exc.errors()[0] if exc.errors() else {}
        loc = " -> ".join(str(l) for l in first_error.get("loc", []))
        msg = f"Validation failed at '{loc}': {first_error.get('msg', 'Invalid input')}" if loc else "Invalid request data."
        return format_error_response(
            code="REQUEST_VALIDATION_ERROR",
            message=msg,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            request=request,
            details={"errors": exc.errors()},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        # Log error securely without exposing secrets
        import logging
        logging.getLogger("medishield.core").error(f"Unhandled server error: {exc}", exc_info=True)
        return format_error_response(
            code="INTERNAL_SERVER_ERROR",
            message="An unexpected server error occurred. Please contact the MediShield security administrator.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            request=request,
        )
