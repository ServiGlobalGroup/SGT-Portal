from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

router = APIRouter()

# Modelos de configuración
class SystemConfig(BaseModel):
    app_name: str = "Portal Grupo SGT"
    company_name: str = "Grupo SGT"
    dark_mode: bool = False
    language: str = "es"
    timezone: str = "Europe/Madrid"
    date_format: str = "DD/MM/YYYY"
    allow_registration: bool = False
    maintenance_mode: bool = False
    debug_mode: bool = False

class EmailConfig(BaseModel):
    smtp_server: str = ""
    smtp_port: str = "587"
    smtp_user: str = ""
    smtp_password: str = ""
    enable_email_notifications: bool = True
    order_notifications: bool = True
    vacation_notifications: bool = True

class StorageConfig(BaseModel):
    max_file_size: str = "50"  # MB
    max_total_storage: str = "10"  # GB
    allowed_extensions: List[str] = ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "png"]
    auto_backup: bool = True
    backup_frequency: str = "daily"
    retention_days: str = "365"

class SecurityConfig(BaseModel):
    password_min_length: int = 8
    require_uppercase: bool = True
    require_numbers: bool = True
    require_special_chars: bool = True
    session_timeout: int = 30  # minutos
    two_factor_auth: bool = False
    login_attempts: int = 5
    lockout_time: int = 15  # minutos

class ConfigUpdate(BaseModel):
    section: str
    config: Dict[str, Any]

# Datos simulados de configuración (en una implementación real estarían en la base de datos)
settings_data = {
    "system": {
        "app_name": "Portal Grupo SGT",
        "company_name": "Grupo SGT",
        "dark_mode": False,
        "language": "es",
        "timezone": "Europe/Madrid",
        "date_format": "DD/MM/YYYY",
        "allow_registration": False,
        "maintenance_mode": False,
        "debug_mode": False,
        "updated_at": "2025-07-14T15:30:00Z"
    },
    "email": {
        "smtp_server": "",
        "smtp_port": "587",
        "smtp_user": "",
        "smtp_password": "",
        "enable_email_notifications": True,
        "order_notifications": True,
        "vacation_notifications": True,
        "updated_at": "2025-07-14T15:30:00Z"
    },
    "storage": {
        "max_file_size": "50",
        "max_total_storage": "10",
        "allowed_extensions": ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "png"],
        "auto_backup": True,
        "backup_frequency": "daily",
        "retention_days": "365",
        "updated_at": "2025-07-14T15:30:00Z"
    },
    "security": {
        "password_min_length": 8,
        "require_uppercase": True,
        "require_numbers": True,
        "require_special_chars": True,
        "session_timeout": 30,
        "two_factor_auth": False,
        "login_attempts": 5,
        "lockout_time": 15,
        "updated_at": "2025-07-14T15:30:00Z"
    }
}

@router.get("/settings")
async def get_all_settings():
    """
    Obtener todas las configuraciones del sistema
    """
    return {
        "system": settings_data["system"],
        "email": {**settings_data["email"], "smtp_password": "••••••••"},  # Ocultar contraseña
        "storage": settings_data["storage"],
        "security": settings_data["security"]
    }

@router.get("/settings/{section}")
async def get_settings_section(section: str):
    """
    Obtener configuración de una sección específica
    """
    if section not in settings_data:
        raise HTTPException(status_code=404, detail=f"Sección '{section}' no encontrada")
    
    config = settings_data[section].copy()
    # Ocultar contraseñas sensibles
    if section == "email" and "smtp_password" in config:
        config["smtp_password"] = "••••••••"
    
    return config

@router.put("/settings/{section}")
async def update_settings_section(section: str, config_update: Dict[str, Any]):
    """
    Actualizar configuración de una sección específica
    """
    if section not in settings_data:
        raise HTTPException(status_code=404, detail=f"Sección '{section}' no encontrada")
    
    # Actualizar solo los campos proporcionados
    for key, value in config_update.items():
        if key in settings_data[section]:
            settings_data[section][key] = value
    
    # Actualizar timestamp
    settings_data[section]["updated_at"] = datetime.now().isoformat()
    
    return {
        "message": f"Configuración de {section} actualizada correctamente",
        "updated_at": settings_data[section]["updated_at"]
    }

@router.post("/settings/test-email")
async def test_email_config():
    """
    Enviar email de prueba para verificar configuración
    """
    # En una implementación real, se enviaría un email usando la configuración SMTP
    return {
        "message": "Email de prueba enviado correctamente",
        "timestamp": datetime.now().isoformat(),
        "recipient": settings_data["email"]["smtp_user"]
    }

@router.post("/settings/backup")
async def create_system_backup():
    """
    Crear backup del sistema
    """
    # En una implementación real, se crearía un backup real del sistema
    backup_id = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    return {
        "message": "Backup creado correctamente",
        "backup_id": backup_id,
        "timestamp": datetime.now().isoformat(),
        "size": "2.5 GB"
    }

@router.post("/settings/clear-cache")
async def clear_system_cache():
    """
    Limpiar caché del sistema
    """
    # En una implementación real, se limpiaría la caché
    return {
        "message": "Caché del sistema limpiada correctamente",
        "timestamp": datetime.now().isoformat(),
        "cleared_items": 1247
    }

@router.post("/settings/reset")
async def reset_system_settings():
    """
    Restablecer configuración del sistema a valores por defecto
    """
    global settings_data
    
    # Restablecer a valores por defecto
    settings_data = {
        "system": {
            "app_name": "Portal Grupo SGT",
            "company_name": "Grupo SGT",
            "dark_mode": False,
            "language": "es",
            "timezone": "Europe/Madrid",
            "date_format": "DD/MM/YYYY",
            "allow_registration": False,
            "maintenance_mode": False,
            "debug_mode": False,
            "updated_at": datetime.now().isoformat()
        },
        "email": {
            "smtp_server": "",
            "smtp_port": "587",
            "smtp_user": "",
            "smtp_password": "",
            "enable_email_notifications": True,
            "order_notifications": True,
            "vacation_notifications": True,
            "updated_at": datetime.now().isoformat()
        },
        "storage": {
            "max_file_size": "50",
            "max_total_storage": "10",
            "allowed_extensions": ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "png"],
            "auto_backup": True,
            "backup_frequency": "daily",
            "retention_days": "365",
            "updated_at": datetime.now().isoformat()
        },
        "security": {
            "password_min_length": 8,
            "require_uppercase": True,
            "require_numbers": True,
            "require_special_chars": True,
            "session_timeout": 30,
            "two_factor_auth": False,
            "login_attempts": 5,
            "lockout_time": 15,
            "updated_at": datetime.now().isoformat()
        }
    }
    
    return {
        "message": "Configuración del sistema restablecida correctamente",
        "timestamp": datetime.now().isoformat()
    }

@router.get("/settings/export")
async def export_settings():
    """
    Exportar toda la configuración del sistema
    """
    export_data = settings_data.copy()
    # Ocultar información sensible
    if "email" in export_data and "smtp_password" in export_data["email"]:
        export_data["email"]["smtp_password"] = "••••••••"
    
    return {
        "settings": export_data,
        "exported_at": datetime.now().isoformat(),
        "version": "1.0"
    }

@router.get("/settings/system-info")
async def get_system_info():
    """
    Obtener información del sistema
    """
    return {
        "version": "1.0.0",
        "uptime": "5 días, 12 horas",
        "database_size": "156 MB",
        "total_users": 25,
        "active_sessions": 8,
        "storage_used": "2.3 GB",
        "storage_available": "7.7 GB",
        "last_backup": "2025-07-13T02:00:00Z",
        "system_health": "Óptimo"
    }
