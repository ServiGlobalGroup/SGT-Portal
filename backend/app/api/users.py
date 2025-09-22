from fastapi import APIRouter, Depends, HTTPException, status, Query, Header
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from app.database.connection import get_db
from app.services.user_service import UserService
from app.models.user import User, UserRole, UserStatus
from app.api.auth import get_current_user
from app.utils.company_context import effective_company_for_request
from app.models.company_enum import Company
from app.models.user_schemas import (
    UserCreate, UserUpdate, UserResponse, UserList, 
    UserListResponse, PasswordChange, AdminPasswordReset
)
import math

router = APIRouter()

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    x_company: Optional[str] = Header(None, alias="X-Company"),
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
        # Resolver empresa efectiva para la petición
        company: Optional[Company] = effective_company_for_request(current_user, x_company)
        user = UserService.create_user(db, user_data, company=company)
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
    available_drivers_only: bool = Query(False, description="Solo conductores disponibles (activos, no de baja)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    x_company: Optional[str] = Header(None, alias="X-Company"),
):
    """
    Obtener lista de usuarios con paginación y filtros.
    - active_only: incluye usuarios ACTIVOS y BAJA (pueden hacer login)
    - available_drivers_only: solo usuarios ACTIVOS con rol TRABAJADOR (conductores disponibles)
    """
    skip = (page - 1) * per_page

    # Construir query base
    query = db.query(User)

    # Filtrar por empresa efectiva si aplica
    company: Optional[Company] = effective_company_for_request(current_user, x_company)
    if company is not None:
        query = query.filter(User.company == company)

    # Filtros
    if search:
        pattern = f"%{search}%"
        query = query.filter(or_(
            User.dni_nie.ilike(pattern),
            User.email.ilike(pattern),
            User.first_name.ilike(pattern),
            User.last_name.ilike(pattern)
        ))
    if department:
        query = query.filter(User.department == department)
    if role:
        query = query.filter(User.role == role)
    
    # Nueva lógica de filtros de estado (sustituye antiguo is_active)
    if available_drivers_only:
        # Solo conductores disponibles: estado ACTIVO y rol TRABAJADOR
        query = query.filter(
            User.status == UserStatus.ACTIVO,
            User.role == UserRole.TRABAJADOR
        )
    elif active_only:
        # Usuarios que pueden hacer login: ACTIVO o BAJA
        query = query.filter(User.status.in_([UserStatus.ACTIVO, UserStatus.BAJA]))
    
    # Si no se especifica ningún filtro, mostrar todos (incluyendo INACTIVOS)

    # Total antes de paginar
    total_users = query.count()
    total_pages = math.ceil(total_users / per_page) if per_page else 1

    # Orden estable y paginación
    users = (query
             .order_by(User.id.asc())
             .offset(skip)
             .limit(per_page)
             .all())

    # Convertir a esquema UserList
    from app.models.user_schemas import UserList as UserListSchema
    users_schema = [UserListSchema.model_validate(u, from_attributes=True) for u in users]
    return UserListResponse(
        users=users_schema,
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
    from sqlalchemy.exc import IntegrityError, DataError
    try:
        user = UserService.update_user(db, user_id, user_data)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        return user
    except IntegrityError as e:
        # Capturar posibles errores de constraint o enum no existente
        db.rollback()
        msg = str(e.orig).lower() if hasattr(e, 'orig') else str(e).lower()
        print(f"DEBUG IntegrityError: {e}")
        print(f"DEBUG msg: {msg}")
        if 'userrole' in msg and 'invalid input value' in msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rol inválido: asegúrate de que el enum en BD incluye P_TALLER (ejecuta script add_p_taller_role.py)"
            )
        if 'duplicate key value' in msg and 'users_email_key' in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email ya existe")
        if 'duplicate key value' in msg and 'users_dni_nie_key' in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="DNI/NIE ya existe")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Error de integridad: {msg}")
    except DataError as e:
        db.rollback()
        print(f"DEBUG DataError: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Datos inválidos: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"DEBUG Exception general: {e}")
        print(f"DEBUG Exception type: {type(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error actualizando usuario: {str(e)}")

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
        # Comprobar si existe usuario para diferenciar error
        user = UserService.get_user_by_id(db, user_id)
        if user:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No se puede eliminar: usuario tiene dietas asociadas")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

@router.patch("/users/{user_id}/set-status", response_model=UserResponse)
async def set_user_status(
    user_id: int,
    status_data: dict,
    db: Session = Depends(get_db)
):
    """
    Cambiar el estado de un usuario (ACTIVO, INACTIVO, BAJA).
    """
    try:
        from app.models.user import UserStatus
        
        # Validar que el status sea válido
        new_status_str = status_data.get('status')
        if new_status_str not in ['ACTIVO', 'INACTIVO', 'BAJA']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Estado inválido. Debe ser ACTIVO, INACTIVO o BAJA"
            )
        
        new_status = UserStatus(new_status_str)
        
        user = UserService.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        # Usar el método del modelo para cambiar el estado
        user.set_status(new_status)
        db.commit()
        db.refresh(user)
        
        # Retornar usuario actualizado
        return user
        
    except Exception as e:
        print(f"Error in set_user_status: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno del servidor: {str(e)}"
        )

@router.patch("/users/{user_id}/toggle-status", response_model=UserResponse)
async def toggle_user_status(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Alternar el estado del usuario entre ACTIVO e INACTIVO (compatibilidad con frontend legacy).
    """
    from app.models.user import UserStatus
    
    user = UserService.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    # Refrescar la instancia para obtener los valores actuales de la BD
    db.refresh(user)
    
    # Alternar entre ACTIVO e INACTIVO basándose en el estado actual
    current_status = getattr(user, 'status', UserStatus.ACTIVO)
    if current_status == UserStatus.ACTIVO:
        new_status = UserStatus.INACTIVO
    else:
        # Si está INACTIVO o BAJA, cambiar a ACTIVO
        new_status = UserStatus.ACTIVO
    
    # Usar el método del modelo para cambiar el estado
    user.set_status(new_status)
    db.commit()
    
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
        
        # Forzar cambio de contraseña en el próximo login
        setattr(user, 'must_change_password', True)
        db.commit()
        
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

@router.post("/users/{user_id}/baja", response_model=UserResponse)
async def set_user_baja(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Poner un usuario en estado de baja.
    """
    success = UserService.set_user_baja(db, user_id)
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
async def get_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    x_company: Optional[str] = Header(None, alias="X-Company"),
):
    """
    Obtener lista de todos los departamentos únicos.
    """
    # Esta consulta necesitaría ser implementada en el UserService
    # Filtrar por empresa efectiva si está disponible
    company: Optional[Company] = effective_company_for_request(current_user, x_company)
    q = db.query(User.department)
    if company is not None:
        q = q.filter(User.company == company)
    departments = q.distinct().all()
    return [dept[0] for dept in departments if dept[0]]

@router.get("/roles", response_model=List[str])
async def get_roles():
    """
    Obtener lista de todos los roles disponibles.
    """
    return [role.value for role in UserRole]

# Endpoints de estadísticas
@router.get("/users/stats/summary")
async def get_user_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    x_company: Optional[str] = Header(None, alias="X-Company"),
):
    """
    Obtener estadísticas generales de usuarios.
    """
    from app.models.user import UserStatus
    
    # Aplicar scoping por empresa si aplica
    company: Optional[Company] = effective_company_for_request(current_user, x_company)
    base_q = db.query(User)
    if company is not None:
        base_q = base_q.filter(User.company == company)

    total_users = base_q.count()
    active_users = base_q.filter(User.status == UserStatus.ACTIVO).count()  # type: ignore[arg-type]
    # Estadísticas por departamento (agrupación correcta)
    from sqlalchemy import func
    dept_q = db.query(User.department, func.count(User.id))
    if company is not None:
        dept_q = dept_q.filter(User.company == company)
    dept_counts = dept_q.group_by(User.department).all()
    departments = {dept: cnt for dept, cnt in dept_counts if dept}

    # Estadísticas por rol (usar value si es Enum)
    role_q = db.query(User.role, func.count(User.id))
    if company is not None:
        role_q = role_q.filter(User.company == company)
    role_counts = role_q.group_by(User.role).all()
    roles = {getattr(role, 'value', str(role)): cnt for role, cnt in role_counts}
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": total_users - active_users,
        "departments": departments,
        "roles": roles
    }
