from pydantic_settings import BaseSettings
from typing import List
import os
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

class Settings(BaseSettings):
    # Database
    # Fallback seguro para permitir import sin DB en desarrollo
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./dev.db")
    
    # Security
    # Evitar vacío para operaciones criptográficas básicas en desarrollo
    secret_key: str = os.getenv("SECRET_KEY", "change-me")
    algorithm: str = "HS256"
    # Duración del access token (se puede aumentar para reducir re-logins).
    # Con el nuevo endpoint /api/auth/refresh se recomienda un valor moderado (ej. 60) y refresco deslizante.
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    
    # Master Admin User (Hidden in code, not in database)
    master_admin_username: str = "admin01"
    # En producción, establezca via variable de entorno MASTER_ADMIN_PASSWORD
    master_admin_password: str = ""  # No hardcodear credenciales
    master_admin_email: str = "sys@internal.local"
    master_admin_name: str = "System Admin"
    
    # System Maintenance Mode
    maintenance_mode: bool = False
    maintenance_message: str = "Sistema en mantenimiento. Por favor, intente más tarde."
    
    # File Storage - Unified structure
    files_base_path: str = os.getenv("FILES_BASE_PATH", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "files")))
    user_files_base_path: str = os.getenv("USER_FILES_BASE_PATH", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "files", "users")))
    traffic_files_base_path: str = os.getenv("TRAFFIC_FILES_BASE_PATH", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "files", "traffic")))
    documents_files_base_path: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "files", "documents"))
    payroll_files_base_path: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "files", "payroll"))
    orders_files_base_path: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "files", "orders"))
    upload_max_size: int = 10485760  # 10MB
    allowed_extensions: List[str] = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png"]
    
    # App
    app_name: str = "Portal SGT"
    app_version: str = "1.0.0"
    debug: bool = False  # Producción por defecto

    # CORS
    allowed_origins: List[str] = [
        # Valores por defecto para desarrollo; en producción, configure ALLOWED_ORIGINS en .env (separadas por comas)
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Instancia global de configuración
settings = Settings()

# Crear directorios base para la estructura unificada si no existen
os.makedirs(settings.files_base_path, exist_ok=True)
os.makedirs(settings.user_files_base_path, exist_ok=True)
os.makedirs(settings.traffic_files_base_path, exist_ok=True)
os.makedirs(settings.documents_files_base_path, exist_ok=True)
os.makedirs(settings.payroll_files_base_path, exist_ok=True)
os.makedirs(settings.orders_files_base_path, exist_ok=True)
