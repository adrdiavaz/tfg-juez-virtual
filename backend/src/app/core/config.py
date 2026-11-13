from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[3] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
    database_url: str
    session_ttl_hours: int = 8
    cookie_secure: bool = False
    cors_origins: list[str] = ["http://localhost:5173"]


settings = Settings()  # type: ignore
