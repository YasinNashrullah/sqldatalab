import sys
from pathlib import Path

# Ensure project root is on sys.path regardless of execution directory
_project_root = str(Path(__file__).resolve().parent.parent.parent)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from backend.app.core.config import settings
from backend.app.core.rate_limit import limiter
from backend.app.core.logging import RequestIdMiddleware, logger
from backend.app.core.errors import (
    AppException,
    app_exception_handler,
    validation_exception_handler,
    generic_exception_handler,
)
from backend.app.models.base import init_db, AsyncSessionLocal
from backend.app.api.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize metadata database tables on startup
    logger.info("Initializing SQL Data Lab metadata database...")
    await init_db()
    logger.info("Database initialized successfully.")

    # Seed default challenges
    logger.info("Seeding challenge library...")
    try:
        from backend.app.api.v1.challenges import seed_or_update_challenges

        async with AsyncSessionLocal() as session:
            await seed_or_update_challenges(session)
        logger.info("Challenge library seeded successfully.")
    except Exception as e:
        logger.error(f"Failed to seed challenges: {e}")

    yield
    # Handle application shutdown
    logger.info("SQL Data Lab shutting down cleanly.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend API for SQL Data Lab - Personal-to-Public Web SQL & Analytics Learning Environment.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds OWASP security response headers to prevent MIME-sniffing, clickjacking, and data leakage."""

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "geolocation=(), camera=(), microphone=()"
        )
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self'; "
            "img-src 'self' data:; "
            "font-src 'self'; "
            "connect-src 'self';"
        )
        return response


# Request tracking and structured logging middleware
app.add_middleware(RequestIdMiddleware)

# OWASP security response headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# Cross-origin resource sharing middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Response-Time-MS", "Content-Disposition"],
)

# Global exception handlers for unified API error responses
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Application API routes
app.include_router(api_router)


@app.get("/", tags=["Root"])
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs": "/docs",
        "api_prefix": settings.API_V1_PREFIX,
    }
