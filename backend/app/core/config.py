import os
from pathlib import Path
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage"
STAGING_DIR = STORAGE_DIR / "staging"
WORKSPACES_DIR = STORAGE_DIR / "workspaces"
ACCOUNTS_DIR = STORAGE_DIR / "accounts"


class Settings(BaseSettings):
    APP_NAME: str = "SQL Data Lab"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Security and authentication configuration
    SECRET_KEY: str = "dev-secret-key-change-in-production-sqltrainweb-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    COOKIE_NAME: str = "datalab_session"

    # Application metadata database configuration
    DATABASE_URL: str = f"sqlite+aiosqlite:///{BASE_DIR}/storage/metadata.db".replace("\\", "/")

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def resolve_sqlite_path(cls, v: str) -> str:
        prefix = "sqlite+aiosqlite:///"
        if v.startswith(prefix):
            raw_path = v[len(prefix):]
            # Maintain absolute path for Windows drive letter targets
            if len(raw_path) > 2 and raw_path[1] == ":":
                return f"{prefix}{raw_path.replace('\\', '/')}"
            # Resolve relative database path against project root
            abs_target = (BASE_DIR / raw_path).resolve()
            return f"{prefix}{str(abs_target).replace('\\', '/')}"
        return v

    # File storage paths
    STORAGE_DIR: Path = STORAGE_DIR
    STAGING_DIR: Path = STAGING_DIR
    WORKSPACES_DIR: Path = WORKSPACES_DIR
    ACCOUNTS_DIR: Path = ACCOUNTS_DIR

    def get_workspace_dataset_dir(self, username: str, workspace_slug_or_id: str) -> Path:
        """Returns structured workspace dataset directory for user."""
        from backend.app.core.security import sanitize_identifier
        clean_user = sanitize_identifier(username, fallback_prefix="user")
        clean_ws = sanitize_identifier(workspace_slug_or_id, fallback_prefix="ws")
        target = self.ACCOUNTS_DIR / clean_user / "workspaces" / clean_ws / "datasets"
        target.mkdir(parents=True, exist_ok=True)
        return target


    # DuckDB query sandbox limits
    DUCKDB_MEMORY_LIMIT: str = "1GB"
    DUCKDB_THREADS: int = 2
    QUERY_TIMEOUT_SECONDS: int = 20
    MAX_RESULT_ROWS: int = 1000
    MAX_UPLOAD_SIZE_BYTES: int = 50 * 1024 * 1024

    # AI provider configuration
    AI_PROVIDER: str = "auto"
    AI_MODEL: str = "gemini-1.5-flash"
    AI_API_KEY: str | None = None
    AI_BASE_URL: str = "https://api.openai.com/v1"
    AI_TIMEOUT_SECONDS: float = 5.0
    AI_COMBO_FALLBACK: bool = True

    # Provider API credentials
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-1.5-flash"

    NINEROUTER_API_KEY: str | None = None
    NINEROUTER_BASE_URL: str = "https://api.9router.com/v1"
    NINEROUTER_MODEL: str = "gpt-4o-mini"

    OPENAI_API_KEY: str | None = None

    # Cross-origin resource sharing origins
    CORS_ORIGINS: list[str] | str = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
    CORS_ORIGIN_REGEX: str | None = r"^https:\/\/.*\.vercel\.app$"

    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            import json
            v_trimmed = v.strip()
            if v_trimmed.startswith("[") and v_trimmed.endswith("]"):
                try:
                    parsed = json.loads(v_trimmed)
                    if isinstance(parsed, list):
                        return [str(item).strip() for item in parsed if str(item).strip()]
                except Exception:
                    pass
            return [origin.strip().strip("\"'").rstrip("/") for origin in v_trimmed.split(",") if origin.strip().strip("\"'")]
        return v

    model_config = SettingsConfigDict(
        env_file=[str(BASE_DIR / ".env"), str(BASE_DIR / "backend" / ".env"), ".env"],
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

# Initialize storage directories on module load
settings.STAGING_DIR.mkdir(parents=True, exist_ok=True)
settings.WORKSPACES_DIR.mkdir(parents=True, exist_ok=True)
settings.ACCOUNTS_DIR.mkdir(parents=True, exist_ok=True)

