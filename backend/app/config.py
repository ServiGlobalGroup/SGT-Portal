from pydantic_settings import BaseSettings
from typing import List
import os
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

class Settings(BaseSettings):
    # Database
    database_url: str
    
    # Security
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # File Storage
    user_files_base_path: str
    traffic_files_base_path: str
    upload_max_size: int = 10485760  # 10MB
    allowed_extensions: List[str] = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png"]
    
    # App
    app_name: str = "Portal SGT"
    app_version: str = "1.0.0"
    debug: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Instancia global de configuración
settings = Settings()

# Crear directorio base para archivos de usuarios si no existe
os.makedirs(settings.user_files_base_path, exist_ok=True)

# Crear directorio base para archivos de tráfico si no existe  
os.makedirs(settings.traffic_files_base_path, exist_ok=True)
