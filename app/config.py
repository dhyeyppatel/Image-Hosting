"""
Application configuration.
Loads settings from environment variables / .env file.
"""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # MongoDB
    mongo_uri: str = Field(..., env="MONGO_URI")

    # Telegram
    bot_token: str = Field(..., env="BOT_TOKEN")
    storage_channel_id: str = Field(..., env="STORAGE_CHANNEL_ID")

    # Application
    base_url: str = Field("https://dhyey.space", env="BASE_URL")
    secret_key: str = Field(..., env="SECRET_KEY")
    max_upload_size_mb: int = Field(20, env="MAX_UPLOAD_SIZE_MB")

    # Rate limiting
    rate_limit_uploads_per_minute: int = Field(10, env="RATE_LIMIT_UPLOADS_PER_MINUTE")

    # Logging
    log_level: str = Field("INFO", env="LOG_LEVEL")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024


@lru_cache()
def get_settings() -> Settings:
    return Settings()
