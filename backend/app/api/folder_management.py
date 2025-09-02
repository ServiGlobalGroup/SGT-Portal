"""
API endpoints para gestión de carpetas y estructura de archivos de usuarios.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database.connection import get_db
from app.services.folder_structure_service import FolderStructureService
from app.services.user_service import UserService
from app.models.user import User
from pydantic import BaseModel

router = APIRouter()

# Esquemas para respuestas
class FolderInfo(BaseModel):
    folder_name: str
    description: str
    file_count: int
    size_bytes: int

class UserFolderStatus(BaseModel):
    dni_nie: str
    full_name: str
    folder_exists: bool
    is_structure_valid: bool
    missing_folders: List[str]
    folder_info: Dict[str, Any] = None
    total_size: int = 0
    total_files: int = 0

class SystemFolderStats(BaseModel):
    total_users: int
    users_with_folders: int
    users_missing_folders: int
    total_system_size: int
    folder_details: List[UserFolderStatus]

@router.get("/folder-management/system-stats", response_model=SystemFolderStats)
async def get_system_folder_stats(db: Session = Depends(get_db)):
    """
    Obtiene estadísticas generales del sistema de carpetas.
    Solo para administradores.
    """
    try:
        # Obtener todos los usuarios
        all_users = UserService.get_all_users(db)
        
        folder_details = []
        total_system_size = 0
        users_with_folders = 0
        users_missing_folders = 0
        
        for user in all_users:
            # Validar estructura de carpetas
            is_valid, missing_folders = FolderStructureService.validate_folder_structure(
                user.dni_nie, user.role
            )
            
            # Obtener información de la carpeta
            folder_info = FolderStructureService.get_folder_info(user.dni_nie)
            
            folder_exists = folder_info is not None
            if folder_exists:
                users_with_folders += 1
                total_system_size += folder_info.get("total_size", 0)
            else:
                users_missing_folders += 1
            
            user_status = UserFolderStatus(
                dni_nie=user.dni_nie,
                full_name=f"{user.first_name} {user.last_name}",
                folder_exists=folder_exists,
                is_structure_valid=is_valid,
                missing_folders=missing_folders,
                folder_info=folder_info,
                total_size=folder_info.get("total_size", 0) if folder_info else 0,
                total_files=folder_info.get("file_count", 0) if folder_info else 0
            )
            
            folder_details.append(user_status)
        
        return SystemFolderStats(
            total_users=len(all_users),
            users_with_folders=users_with_folders,
            users_missing_folders=users_missing_folders,
            total_system_size=total_system_size,
            folder_details=folder_details
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo estadísticas: {str(e)}"
        )

@router.get("/folder-management/user/{dni_nie}", response_model=UserFolderStatus)
async def get_user_folder_status(dni_nie: str, db: Session = Depends(get_db)):
    """
    Obtiene el estado de las carpetas de un usuario específico.
    """
    try:
        # Verificar que el usuario existe
        user = UserService.get_user_by_dni(db, dni_nie)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        # Validar estructura de carpetas
        is_valid, missing_folders = FolderStructureService.validate_folder_structure(
            user.dni_nie, user.role
        )
        
        # Obtener información de la carpeta
        folder_info = FolderStructureService.get_folder_info(user.dni_nie)
        folder_exists = folder_info is not None
        
        return UserFolderStatus(
            dni_nie=user.dni_nie,
            full_name=f"{user.first_name} {user.last_name}",
            folder_exists=folder_exists,
            is_structure_valid=is_valid,
            missing_folders=missing_folders,
            folder_info=folder_info,
            total_size=folder_info.get("total_size", 0) if folder_info else 0,
            total_files=folder_info.get("file_count", 0) if folder_info else 0
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo información del usuario: {str(e)}"
        )

@router.post("/folder-management/repair/{dni_nie}")
async def repair_user_folder_structure(dni_nie: str, db: Session = Depends(get_db)):
    """
    Repara la estructura de carpetas de un usuario específico.
    Crea las carpetas faltantes según su rol.
    """
    try:
        # Verificar que el usuario existe
        user = UserService.get_user_by_dni(db, dni_nie)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        # Reparar la estructura
        success = FolderStructureService.repair_folder_structure(
            user.dni_nie, user.role, user.first_name, user.last_name, user.department
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo reparar la estructura de carpetas"
            )
        
        # Obtener estado actualizado
        is_valid, missing_folders = FolderStructureService.validate_folder_structure(
            user.dni_nie, user.role
        )
        
        return {
            "message": "Estructura de carpetas reparada exitosamente",
            "dni_nie": dni_nie,
            "is_valid": is_valid,
            "remaining_missing_folders": missing_folders
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reparando estructura: {str(e)}"
        )

@router.post("/folder-management/migrate/{dni_nie}")
async def migrate_user_folder_structure(dni_nie: str, db: Session = Depends(get_db)):
    """
    Migra la estructura de carpetas antigua de un usuario a la nueva estructura.
    """
    try:
        # Verificar que el usuario existe
        user = UserService.get_user_by_dni(db, dni_nie)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        # Migrar la estructura
        success = FolderStructureService.migrate_old_structure(
            user.dni_nie, user.role, user.first_name, user.last_name, user.department
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo migrar la estructura de carpetas"
            )
        
        return {
            "message": "Migración de estructura completada exitosamente",
            "dni_nie": dni_nie,
            "status": "migrated"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error migrando estructura: {str(e)}"
        )

@router.post("/folder-management/repair-all")
async def repair_all_folder_structures(db: Session = Depends(get_db)):
    """
    Repara la estructura de carpetas de todos los usuarios del sistema.
    Proceso en lote para administradores.
    """
    try:
        # Obtener todos los usuarios
        all_users = UserService.get_all_users(db)
        
        results = {
            "total_users": len(all_users),
            "repaired": 0,
            "failed": 0,
            "details": []
        }
        
        for user in all_users:
            try:
                success = FolderStructureService.repair_folder_structure(
                    user.dni_nie, user.role, user.first_name, user.last_name, user.department
                )
                
                if success:
                    results["repaired"] += 1
                    results["details"].append({
                        "dni_nie": user.dni_nie,
                        "status": "success",
                        "message": "Estructura reparada"
                    })
                else:
                    results["failed"] += 1
                    results["details"].append({
                        "dni_nie": user.dni_nie,
                        "status": "failed",
                        "message": "No se pudo reparar"
                    })
                    
            except Exception as e:
                results["failed"] += 1
                results["details"].append({
                    "dni_nie": user.dni_nie,
                    "status": "error",
                    "message": str(e)
                })
        
        return {
            "message": f"Proceso completado: {results['repaired']} reparadas, {results['failed']} fallidas",
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en proceso de reparación masiva: {str(e)}"
        )

@router.post("/folder-management/initialize-system")
async def initialize_system_folders():
    """
    Inicializa las carpetas base del sistema.
    """
    try:
        FolderStructureService.initialize_system_folders()
        
        return {
            "message": "Sistema de carpetas inicializado correctamente",
            "status": "success"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error inicializando sistema: {str(e)}"
        )

@router.get("/folder-management/structure-info/{role}")
async def get_folder_structure_info(role: str):
    """
    Obtiene información sobre la estructura de carpetas para un rol específico.
    """
    try:
        # Convertir string a enum
        user_role = None
        for role_enum in [UserRole.TRABAJADOR, UserRole.TRAFICO, UserRole.ADMINISTRADOR]:
            if role_enum.name.lower() == role.lower():
                user_role = role_enum
                break
        
        if not user_role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rol no válido"
            )
        
        structure = FolderStructureService.FOLDER_STRUCTURES.get(
            user_role, 
            FolderStructureService.FOLDER_STRUCTURES[UserRole.TRABAJADOR]
        )
        
        return {
            "role": user_role.name,
            "folders": [
                {
                    "name": folder_name,
                    "description": description
                }
                for folder_name, description in structure.items()
            ],
            "total_folders": len(structure)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo información de estructura: {str(e)}"
        )
