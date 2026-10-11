from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "Family Health Guardian API"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    SUPABASE_URL: str = "https://placeholder-url.supabase.co"
    SUPABASE_KEY: str = "placeholder-key"
    # Service-role key — bypasses RLS for backend Storage operations.
    # NEVER expose this in frontend code, logs, or public endpoints.
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    SUPABASE_JWT_SECRET: str = "placeholder-jwt-secret-min-32-chars-long"

    # Supabase Storage bucket for medical report files
    HEALTH_RECORDS_BUCKET: str = "medical-reports"

    DIABETES_MODEL_PATH: Optional[str] = None
    HYPERTENSION_MODEL_PATH: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
