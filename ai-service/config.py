import os
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field

# Search current directory, then check parent directory for .env config
env_path = Path(".env")
if not env_path.exists():
    parent_env = Path("..") / ".env"
    if parent_env.exists():
        env_path = parent_env

class Settings(BaseSettings):
    GEMINI_API_KEY: str = Field(default="", env="GEMINI_API_KEY")
    REPOSITORIES_DIR: str = Field(default="./repositories", env="REPOSITORIES_DIR")
    VECTOR_DB_DIR: str = Field(default="./vector-db", env="VECTOR_DB_DIR")
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")

    class Config:
        env_file = str(env_path.resolve()) if env_path.exists() else ".env"
        extra = "ignore"

# Ensure dirs exist
settings = Settings()
os.makedirs(settings.REPOSITORIES_DIR, exist_ok=True)
os.makedirs(settings.VECTOR_DB_DIR, exist_ok=True)
