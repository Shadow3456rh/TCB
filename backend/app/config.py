"""
RBU Platform — Configuration (Simplified)
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Firebase
    firebase_credentials_path: str = "./firebase-credentials.json"
    firebase_project_id: str = "your_project_id"

    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # App
    environment: str = "development"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    @property
    def is_development(self) -> bool:
        return self.environment == "development"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
