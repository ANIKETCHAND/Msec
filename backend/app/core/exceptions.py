"""MediShield Core Domain Exceptions.

Provides structured, domain-specific exception types for centralized
FastAPI error handling and consistent API error responses.
"""

from typing import Optional, Dict, Any


class MediShieldException(Exception):
    """Base domain exception for MediShield platform."""

    def __init__(
        self,
        message: str,
        code: str = "MEDISHIELD_ERROR",
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}


class ResourceNotFoundException(MediShieldException):
    """Raised when a requested resource (device, assessment, report, etc.) does not exist."""

    def __init__(self, resource_type: str, resource_id: str):
        super().__init__(
            message=f"{resource_type} '{resource_id}' was not found.",
            code="RESOURCE_NOT_FOUND",
            status_code=404,
            details={"resource_type": resource_type, "resource_id": resource_id},
        )


class PermissionDeniedException(MediShieldException):
    """Raised when an authenticated actor lacks necessary RBAC privileges."""

    def __init__(self, message: str = "Insufficient permissions to perform this operation.", required_role: Optional[str] = None):
        super().__init__(
            message=message,
            code="PERMISSION_DENIED",
            status_code=403,
            details={"required_role": required_role} if required_role else {},
        )


class InvalidAssessmentScopeException(MediShieldException):
    """Raised when an assessment target or requested tools violate scope constraints."""

    def __init__(self, message: str, scope_id: Optional[str] = None):
        super().__init__(
            message=message,
            code="INVALID_ASSESSMENT_SCOPE",
            status_code=403,
            details={"scope_id": scope_id} if scope_id else {},
        )


class AssessmentConflictException(MediShieldException):
    """Raised when an assessment state transition is invalid or a scan is already running."""

    def __init__(self, message: str = "An assessment cannot be started or modified in the current state."):
        super().__init__(
            message=message,
            code="ASSESSMENT_CONFLICT",
            status_code=409,
        )


class ScannerUnavailableException(MediShieldException):
    """Raised when a required defensive scanner binary or adapter is not operational."""

    def __init__(self, tool_name: str, message: Optional[str] = None):
        super().__init__(
            message=message or f"Defensive scanner tool '{tool_name}' is not installed or configured on the host.",
            code="SCANNER_UNAVAILABLE",
            status_code=503,
            details={"tool_name": tool_name},
        )


class AssessmentExecutionException(MediShieldException):
    """Raised when a defensive scan execution fails unexpectedly."""

    def __init__(self, message: str, assessment_id: Optional[str] = None):
        super().__init__(
            message=message,
            code="ASSESSMENT_EXECUTION_ERROR",
            status_code=500,
            details={"assessment_id": assessment_id} if assessment_id else {},
        )


class ReportGenerationException(MediShieldException):
    """Raised when generating a PDF or HTML security assessment report fails."""

    def __init__(self, message: str, report_format: str = "PDF"):
        super().__init__(
            message=message,
            code="REPORT_GENERATION_ERROR",
            status_code=500,
            details={"format": report_format},
        )


class IntegrityVerificationException(MediShieldException):
    """Raised when cryptographic SHA-256 or AES-256-GCM verification detects tampering."""

    def __init__(self, message: str, record_id: Optional[str] = None):
        super().__init__(
            message=message,
            code="INTEGRITY_VERIFICATION_FAILED",
            status_code=400,
            details={"record_id": record_id} if record_id else {},
        )


class DatabaseOperationException(MediShieldException):
    """Raised when a persistent storage transaction or integrity constraint fails."""

    def __init__(self, message: str = "Database operation could not be completed."):
        super().__init__(
            message=message,
            code="DATABASE_ERROR",
            status_code=500,
        )
