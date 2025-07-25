from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.connection import get_db
from app.services.user_service import UserService
from app.models.user import User, UserRole
from app.models.user_schemas import (
    UserCreate, UserUpdate, UserResponse, UserList, 
    UserListResponse, PasswordChange, AdminPasswordReset
)
import math

router = APIRouter()

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Crear un nuevo usuario.
    
    - **dni_nie**: DNI o NIE del usuario (único)
    - **email**: Email corporativo (único)
    - **password**: Contraseña (mínimo 8 caracteres)
    - **department**: Departamento del usuario
    - Automáticamente crea la carpeta personal del usuario
    """
    try:
        user = UserService.create_user(db, user_data)
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creando usuario: {str(e)}"
        )

@router.get("/users", response_model=UserListResponse)
async def get_users(
    page: int = Query(1, ge=1, description="Número de página"),
    per_page: int = Query(10, ge=1, le=100, description="Usuarios por página"),
    search: Optional[str] = Query(None, description="Buscar por DNI, email o nombre"),
    department: Optional[str] = Query(None, description="Filtrar por departamento"),
    role: Optional[UserRole] = Query(None, description="Filtrar por rol"),
    active_only: bool = Query(True, description="Solo usuarios activos"),
    db: Session = Depends(get_db)
):
    """
    Obtener lista de usuarios con paginación y filtros.
    """
    skip = (page - 1) * per_page
    
    if search:
        users = UserService.search_users(db, search)
    elif department:
        users = UserService.get_users_by_department(db, department)
    elif role:
        users = UserService.get_users_by_role(db, role)
    else:
        users = UserService.get_all_users(db, skip=skip, limit=per_page)
    
    # Filtrar por activos si se solicita
    if active_only:
        users = [user for user in users if user.is_active]
    
    # Aplicar paginación si no es una búsqueda
    if not search and not department and not role:
        total_users = len(users)
        paginated_users = users[skip:skip + per_page]
    else:
        total_users = len(users)
        paginated_users = users[skip:skip + per_page]
    
    total_pages = math.ceil(total_users / per_page)
    
    return UserListResponse(
        users=paginated_users,
        total=total_users,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtener un usuario específico por ID.
    """
    user = UserService.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    return user

@router.get("/users/dni/{dni_nie}", response_model=UserResponse)
async def get_user_by_dni(
    dni_nie: str,
    db: Session = Depends(get_db)
):
    """
    Obtener un usuario específico por DNI/NIE.
    """
    user = UserService.get_user_by_dni(db, dni_nie)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    return user

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db)
):
    """
    Actualizar un usuario existente.
    """
    user = UserService.update_user(db, user_id, user_data)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    return user

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Desactivar un usuario (soft delete).
    """
    success = UserService.delete_user(db, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

@router.delete("/users/{user_id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_permanently(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Eliminar un usuario permanentemente de la base de datos (hard delete).
    """
    success = UserService.delete_user_permanently(db, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )

@router.patch("/users/{user_id}/toggle-status", response_model=UserResponse)
async def toggle_user_status(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Alternar el estado (activar/desactivar) de un usuario.
    """
    user = UserService.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    # Alternar estado
    if user.is_active:
        success = UserService.delete_user(db, user_id)  # Desactivar
    else:
        success = UserService.activate_user(db, user_id)  # Activar
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al cambiar el estado del usuario"
        )
    
    # Retornar usuario actualizado
    updated_user = UserService.get_user_by_id(db, user_id)
    return updated_user

@router.patch("/users/{user_id}/password", response_model=dict)
async def change_user_password(
    user_id: int,
    password_data: AdminPasswordReset,
    db: Session = Depends(get_db)
):
    """
    Cambiar la contraseña de un usuario (solo para administradores).
    """
    user = UserService.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    # Verificar que las contraseñas coincidan
    if password_data.new_password != password_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Las contraseñas no coinciden"
        )
    
    try:
        success = UserService.change_password(db, user_id, password_data.new_password)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al cambiar la contraseña"
            )
        
        return {"message": "Contraseña cambiada exitosamente"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al cambiar la contraseña: {str(e)}"
        )

@router.post("/users/{user_id}/activate", response_model=UserResponse)
async def activate_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Activar un usuario desactivado.
    """
    success = UserService.activate_user(db, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    user = UserService.get_user_by_id(db, user_id)
    return user

@router.post("/users/{user_id}/verify", response_model=UserResponse)
async def verify_user_email(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Verificar el email de un usuario.
    """
    success = UserService.verify_user_email(db, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    user = UserService.get_user_by_id(db, user_id)
    return user

@router.get("/departments", response_model=List[str])
async def get_departments(db: Session = Depends(get_db)):
    """
    Obtener lista de todos los departamentos únicos.
    """
    # Esta consulta necesitaría ser implementada en el UserService
    departments = db.query(User.department).distinct().all()
    return [dept[0] for dept in departments if dept[0]]

@router.get("/roles", response_model=List[str])
async def get_roles():
    """
    Obtener lista de todos los roles disponibles.
    """
    return [role.value for role in UserRole]

# Endpoints de estadísticas
@router.get("/users/stats/summary")
async def get_user_stats(db: Session = Depends(get_db)):
    """
    Obtener estadísticas generales de usuarios.
    """
    total_users = len(UserService.get_all_users(db))
    active_users = len([u for u in UserService.get_all_users(db) if u.is_active])
    
    # Estadísticas por departamento
    departments = {}
    for user in UserService.get_all_users(db):
        dept = user.department
        if dept not in departments:
            departments[dept] = 0
        departments[dept] += 1
    
    # Estadísticas por rol
    roles = {}
    for user in UserService.get_all_users(db):
        role = user.role.value
        if role not in roles:
            roles[role] = 0
        roles[role] += 1
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": total_users - active_users,
        "departments": departments,
        "roles": roles
    }
