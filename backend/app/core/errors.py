from typing import Any
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging

logger = logging.getLogger("datalab.errors")


class AppException(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: dict[str, Any] | None = None,
    ):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class InvalidCredentialsError(AppException):
    def __init__(self, message: str = "Invalid email/username or password."):
        super().__init__(
            code="AUTH_INVALID_CREDENTIALS",
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class UnauthorizedError(AppException):
    def __init__(self, message: str = "Authentication required or session expired."):
        super().__init__(
            code="AUTH_UNAUTHORIZED",
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class ForbiddenError(AppException):
    def __init__(self, message: str = "You do not have access to this resource."):
        super().__init__(
            code="AUTH_FORBIDDEN",
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
        )


class NotFoundError(AppException):
    def __init__(self, message: str = "The requested resource was not found."):
        super().__init__(
            code="NOT_FOUND",
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
        )


class FileTooLargeError(AppException):
    def __init__(self, message: str = "File size exceeds allowed limit (50MB)."):
        super().__init__(
            code="FILE_TOO_LARGE",
            message=message,
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        )


class FileUnsupportedTypeError(AppException):
    def __init__(self, message: str = "File extension or format is not supported."):
        super().__init__(
            code="FILE_UNSUPPORTED_TYPE",
            message=message,
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        )


class CSVParseError(AppException):
    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(
            code="CSV_PARSE_ERROR",
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details,
        )


class SQLSyntaxError(AppException):
    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(
            code="SQL_SYNTAX_ERROR",
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details,
        )


class SQLTimeoutError(AppException):
    def __init__(self, message: str = "Query exceeded maximum execution time.", details: dict[str, Any] | None = None):
        super().__init__(
            code="SQL_EXECUTION_TIMEOUT",
            message=message,
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            details=details,
        )


class SQLResourceLimitError(AppException):
    def __init__(self, message: str = "Query exceeded memory or resource limits.", details: dict[str, Any] | None = None):
        super().__init__(
            code="SQL_RESOURCE_LIMIT",
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details,
        )


class AIServiceUnavailableError(AppException):
    def __init__(self, message: str = "AI Assistant service is currently unavailable.", details: dict[str, Any] | None = None):
        super().__init__(
            code="AI_SERVICE_UNAVAILABLE",
            message=message,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details=details,
        )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "req_unknown")
    logger.warning(f"[{request_id}] AppException: {exc.code} - {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "request_id": request_id,
                "details": exc.details,
            },
        },
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "req_unknown")
    errors = exc.errors()
    formatted_errors = []
    for err in errors:
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        formatted_errors.append({"field": loc, "msg": err.get("msg", "")})

    logger.warning(f"[{request_id}] Validation error: {formatted_errors}")
    summary_msg = "; ".join(f"{e['field'].split(' -> ')[-1]}: {e['msg']}" for e in formatted_errors) if formatted_errors else "Request validation failed."
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_FAILED",
                "message": summary_msg,
                "request_id": request_id,
                "details": {"errors": formatted_errors},
            },
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "req_unknown")
    logger.error(f"[{request_id}] Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred. Please try again.",
                "request_id": request_id,
                "details": {"error_class": exc.__class__.__name__},
            },
        },
    )
