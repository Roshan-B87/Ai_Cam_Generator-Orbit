from pydantic_settings import BaseSettings
import secrets

class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    TAVILY_API_KEY: str = ""
    UPLOAD_DIR: str = "uploads"
    CHROMA_DB_PATH: str = "./chromadb"
    JWT_SECRET: str = secrets.token_urlsafe(32)
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440  # 24 hours

    class Config:
        env_file = ".env"

settings = Settings()
