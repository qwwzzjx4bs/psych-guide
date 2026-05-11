"""アプリケーション設定管理"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # NCBI
    ncbi_api_key: str = ""

    # Database
    database_url: str = "sqlite+aiosqlite:///./data/literature.db"

    # SMTP
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    alert_from_address: str = ""

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # Application
    app_env: str = "development"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:5500,https://qwwzzjx4bs.github.io"

    # Scheduler
    fetch_interval_hours: int = 6

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


settings = Settings()
