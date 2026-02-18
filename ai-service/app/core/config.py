from pydantic import BaseSettings
import os

class Settings(BaseSettings):
    # Database
    database_url: str = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/bazaarlink")

    # Redis
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")

    # JWT
    jwt_secret: str = os.getenv("JWT_SECRET", "your-super-secret-jwt-key-here")

    # Environment
    environment: str = os.getenv("ENVIRONMENT", "development")

    # Model settings
    model_path: str = os.getenv("MODEL_PATH", "./models")
    retraining_interval_hours: int = int(os.getenv("RETRAINING_INTERVAL_HOURS", "24"))

    class Config:
        env_file = ".env"

settings = Settings()