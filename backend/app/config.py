from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Union


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Application
    APP_NAME: str = "University Marks Management System"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str
    DB_ECHO: bool = False

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS - stored as string in .env, converted to list
    ALLOWED_ORIGINS: Union[str, List[str]] = "http://localhost:3000"

    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    class Config:
        env_file = ".env"
        case_sensitive = True

    @field_validator('ALLOWED_ORIGINS', mode='before')
    @classmethod
    def parse_allowed_origins(cls, v):
        """Parse comma-separated string or list"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    def get_allowed_origins(self) -> List[str]:
        """Get ALLOWED_ORIGINS as list"""
        if isinstance(self.ALLOWED_ORIGINS, str):
            return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
        return self.ALLOWED_ORIGINS


# Global settings instance
settings = Settings()
