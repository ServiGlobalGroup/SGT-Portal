from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.database.connection import get_db
from app.api.auth import get_current_user
from app.models.user import User, MasterAdminUser
import os
import json

router = APIRouter()

# Archivo para almacenar el estado de mantenimiento
MAINTENANCE_FILE = "maintenance_status.json"

class MaintenanceConfig(BaseModel):
    maintenance_mode: bool
    maintenance_message: Optional[str] = "Sistema en mantenimiento. Por favor, intente más tarde."
    maintenance_start: Optional[datetime] = None
    maintenance_end: Optional[datetime] = None

class SystemStats(BaseModel):
    app_name: str = "Portal SGT"
    version: str = "1.0.0"
    uptime: str
    total_users: int
    active_sessions: int
    maintenance_mode: bool
    last_backup: Optional[str] = None

def load_maintenance_config():
    """Cargar configuración de mantenimiento desde archivo"""
    try:
        if os.path.exists(MAINTENANCE_FILE):
            with open(MAINTENANCE_FILE, 'r') as f:
                data = json.load(f)
                return MaintenanceConfig(**data)
    except Exception:
        pass
    return MaintenanceConfig(maintenance_mode=False)

def save_maintenance_config(config: MaintenanceConfig):
    """Guardar configuración de mantenimiento en archivo"""
    try:
        with open(MAINTENANCE_FILE, 'w') as f:
            json.dump(config.dict(), f, indent=2, default=str)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error guardando configuración: {str(e)}")

def is_master_admin(user) -> bool:
    """Verificar si el usuario es el administrador maestro"""
    return isinstance(user, MasterAdminUser)

@router.get("/settings", response_model=dict)
async def get_system_settings(current_user: User | MasterAdminUser = Depends(get_current_user)):
    """
    Obtener configuración del sistema - SOLO para usuario maestro
    """
    if not is_master_admin(current_user):
        raise HTTPException(status_code=403, detail="Acceso denegado. Solo el usuario maestro puede acceder a la configuración.")
    
    maintenance_config = load_maintenance_config()
    
    return {
        "maintenance": {
            "maintenance_mode": maintenance_config.maintenance_mode,
            "maintenance_message": maintenance_config.maintenance_message,
            "maintenance_start": maintenance_config.maintenance_start,
            "maintenance_end": maintenance_config.maintenance_end
        },
        "system": {
            "app_name": "Portal SGT",
            "version": "1.0.0",
            "environment": "production",
            "debug_mode": False
        }
    }

@router.post("/settings/maintenance", response_model=dict)
async def toggle_maintenance_mode(
    maintenance_config: MaintenanceConfig,
    current_user: User | MasterAdminUser = Depends(get_current_user)
):
    """
    Activar/Desactivar modo de mantenimiento - SOLO para usuario maestro
    """
    if not is_master_admin(current_user):
        raise HTTPException(status_code=403, detail="Acceso denegado. Solo el usuario maestro puede cambiar el modo de mantenimiento.")
    
    # Actualizar timestamps
    if maintenance_config.maintenance_mode:
        maintenance_config.maintenance_start = datetime.now()
    else:
        maintenance_config.maintenance_end = datetime.now()
    
    save_maintenance_config(maintenance_config)
    
    action = "activado" if maintenance_config.maintenance_mode else "desactivado"
    
    return {
        "message": f"Modo de mantenimiento {action} correctamente",
        "maintenance_mode": maintenance_config.maintenance_mode,
        "timestamp": datetime.now().isoformat(),
        "changed_by": "Usuario Maestro"
    }

@router.get("/settings/maintenance/status")
async def get_maintenance_status():
    """
    Obtener estado de mantenimiento - Endpoint público para verificar el estado
    """
    maintenance_config = load_maintenance_config()
    
    return {
        "maintenance_mode": maintenance_config.maintenance_mode,
        "maintenance_message": maintenance_config.maintenance_message,
        "maintenance_start": maintenance_config.maintenance_start,
        "maintenance_end": maintenance_config.maintenance_end
    }

@router.get("/settings/system-stats", response_model=dict)
async def get_system_stats(
    current_user: User | MasterAdminUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener estadísticas del sistema - SOLO para usuario maestro
    """
    if not is_master_admin(current_user):
        raise HTTPException(status_code=403, detail="Acceso denegado. Solo el usuario maestro puede ver las estadísticas del sistema.")
    
    maintenance_config = load_maintenance_config()
    
    # Obtener número total de usuarios (consulta a la base de datos)
    from app.models.user import User as UserModel
    total_users = db.query(UserModel).count()
    
    return {
        "system": {
            "app_name": "Portal SGT",
            "version": "1.0.0",
            "maintenance_mode": maintenance_config.maintenance_mode,
            "uptime": "Sistema operativo",
            "environment": "production"
        },
        "users": {
            "total_users": total_users,
            "active_sessions": 1,  # En una implementación real se consultarían las sesiones activas
            "master_admin_access": True
        },
        "storage": {
            "total_space": "100 GB",
            "used_space": "2.5 GB", 
            "available_space": "97.5 GB"
        },
        "security": {
            "last_backup": "N/A",
            "system_health": "Óptimo",
            "security_level": "Máximo"
        }
    }

@router.post("/settings/emergency-shutdown", response_model=dict)
async def emergency_shutdown(current_user: User | MasterAdminUser = Depends(get_current_user)):
    """
    Cierre de emergencia del sistema - SOLO para usuario maestro
    """
    if not is_master_admin(current_user):
        raise HTTPException(status_code=403, detail="Acceso denegado. Solo el usuario maestro puede realizar un cierre de emergencia.")
    
    # Activar modo de mantenimiento inmediatamente
    emergency_config = MaintenanceConfig(
        maintenance_mode=True,
        maintenance_message="Sistema temporalmente fuera de servicio por mantenimiento de emergencia. Contacte al administrador.",
        maintenance_start=datetime.now()
    )
    
    save_maintenance_config(emergency_config)
    
    return {
        "message": "Sistema puesto en modo de mantenimiento de emergencia",
        "maintenance_mode": True,
        "timestamp": datetime.now().isoformat(),
        "action_by": "Usuario Maestro - Cierre de Emergencia"
    }

@router.delete("/settings/reset-all", response_model=dict)
async def reset_system_settings(current_user: User | MasterAdminUser = Depends(get_current_user)):
    """
    Restablecer todas las configuraciones del sistema - SOLO para usuario maestro
    """
    if not is_master_admin(current_user):
        raise HTTPException(status_code=403, detail="Acceso denegado. Solo el usuario maestro puede restablecer el sistema.")
    
    # Restablecer modo de mantenimiento
    default_config = MaintenanceConfig(maintenance_mode=False)
    save_maintenance_config(default_config)
    
    return {
        "message": "Sistema restablecido correctamente. Modo de mantenimiento desactivado.",
        "timestamp": datetime.now().isoformat(),
        "reset_by": "Usuario Maestro"
    }
