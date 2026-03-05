from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    TAVILY_API_KEY: str = ""
    UPLOAD_DIR: str = "uploads"
    CHROMA_DB_PATH: str = "./chromadb"

    class Config:
        env_file = ".env"

settings = Settings()
