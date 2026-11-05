from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    go_judge_url: str = "http://localhost:5050"
    go_judge_auth_token: str = ""
    go_judge_timeout: float = 30.0


settings = Settings()
