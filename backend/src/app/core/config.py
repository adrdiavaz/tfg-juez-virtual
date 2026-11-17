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
    frontend_url: str = "http://localhost:5173"
    activation_ttl_hours: int = 72
    password_reset_ttl_minutes: int = 30
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_starttls: bool = False
    mail_from: str = "Juez virtual <no-reply@juez-virtual.local>"


settings = Settings()  # type: ignore
