"""
Sistema de control de acceso basado en roles para SGT Portal
Define los permisos específicos para cada rol del sistema.
"""
from enum import Enum
from typing import Set, Dict
from app.models.user import UserRole

class Permission(Enum):
    # Permisos básicos - todos los roles
    VIEW_DOCUMENTS = "view_documents"
    VIEW_ORDERS = "view_orders" 
    VIEW_VACATIONS = "view_vacations"
    VIEW_PROFILE = "view_profile"
    EDIT_PROFILE = "edit_profile"
    
    # Permisos de Tráfico
    MANAGE_TRAFFIC = "manage_traffic"
    VIEW_TRAFFIC = "view_traffic"
    EDIT_TRAFFIC = "edit_traffic"
    DELETE_TRAFFIC = "delete_traffic"
    UPLOAD_TRAFFIC_DOCUMENTS = "upload_traffic_documents"
    
    # Permisos de Administración
    MANAGE_USERS = "manage_users"
    VIEW_ALL_USERS = "view_all_users"
    CREATE_USERS = "create_users"
    EDIT_USERS = "edit_users"
    DELETE_USERS = "delete_users"
    RESET_PASSWORDS = "reset_passwords"
    
    MANAGE_SYSTEM = "manage_system"
    VIEW_SYSTEM_SETTINGS = "view_system_settings"
    EDIT_SYSTEM_SETTINGS = "edit_system_settings"
    
    VIEW_ADMIN_DASHBOARD = "view_admin_dashboard"
    VIEW_ALL_DOCUMENTS = "view_all_documents"
    MANAGE_ALL_ORDERS = "manage_all_orders"
    
    # Permisos específicos de documentos
    UPLOAD_DOCUMENTS = "upload_documents"
    DELETE_DOCUMENTS = "delete_documents"
    
    # Permisos de vacaciones
    APPROVE_VACATIONS = "approve_vacations"
    MANAGE_VACATIONS = "manage_vacations"

# Definir permisos por rol
ROLE_PERMISSIONS: Dict[UserRole, Set[Permission]] = {
    UserRole.TRABAJADOR: {
        # Acceso básico: Documentos, Órdenes y Vacaciones
        Permission.VIEW_DOCUMENTS,
        Permission.VIEW_ORDERS,
        Permission.VIEW_VACATIONS,
        Permission.VIEW_PROFILE,
        Permission.EDIT_PROFILE,
        Permission.UPLOAD_DOCUMENTS,
        Permission.DELETE_DOCUMENTS,  # Solo sus propios documentos
    },
    
    UserRole.TRAFICO: {
        # Todo lo de TRABAJADOR + gestión completa de tráfico
        Permission.VIEW_DOCUMENTS,
        Permission.VIEW_ORDERS,
        Permission.VIEW_VACATIONS,
        Permission.VIEW_PROFILE,
        Permission.EDIT_PROFILE,
        Permission.UPLOAD_DOCUMENTS,
        Permission.DELETE_DOCUMENTS,
        
        # Permisos específicos de tráfico
        Permission.MANAGE_TRAFFIC,
        Permission.VIEW_TRAFFIC,
        Permission.EDIT_TRAFFIC,
        Permission.DELETE_TRAFFIC,
        Permission.UPLOAD_TRAFFIC_DOCUMENTS,
    },
    
    UserRole.ADMINISTRADOR: {
        # Acceso completo a todo el sistema
        Permission.VIEW_DOCUMENTS,
        Permission.VIEW_ORDERS,
        Permission.VIEW_VACATIONS,
        Permission.VIEW_PROFILE,
        Permission.EDIT_PROFILE,
        Permission.UPLOAD_DOCUMENTS,
        Permission.DELETE_DOCUMENTS,
        
        Permission.MANAGE_TRAFFIC,
        Permission.VIEW_TRAFFIC,
        Permission.EDIT_TRAFFIC,
        Permission.DELETE_TRAFFIC,
        Permission.UPLOAD_TRAFFIC_DOCUMENTS,
        
        Permission.MANAGE_USERS,
        Permission.VIEW_ALL_USERS,
        Permission.CREATE_USERS,
        Permission.EDIT_USERS,
        Permission.DELETE_USERS,
        Permission.RESET_PASSWORDS,
        
        Permission.MANAGE_SYSTEM,
        Permission.VIEW_SYSTEM_SETTINGS,
        Permission.EDIT_SYSTEM_SETTINGS,
        
        Permission.VIEW_ADMIN_DASHBOARD,
        Permission.VIEW_ALL_DOCUMENTS,
        Permission.MANAGE_ALL_ORDERS,
        
        Permission.APPROVE_VACATIONS,
        Permission.MANAGE_VACATIONS,
    }
}

def has_permission(user_role: UserRole, permission: Permission) -> bool:
    """
    Verifica si un rol tiene un permiso específico.
    
    Args:
        user_role: Rol del usuario
        permission: Permiso a verificar
        
    Returns:
        bool: True si el rol tiene el permiso, False en caso contrario
    """
    return permission in ROLE_PERMISSIONS.get(user_role, set())

def get_user_permissions(user_role: UserRole) -> Set[Permission]:
    """
    Obtiene todos los permisos de un rol específico.
    
    Args:
        user_role: Rol del usuario
        
    Returns:
        Set[Permission]: Conjunto de permisos del rol
    """
    return ROLE_PERMISSIONS.get(user_role, set())

def can_access_module(user_role: UserRole, module: str) -> bool:
    """
    Verifica si un rol puede acceder a un módulo específico.
    
    Args:
        user_role: Rol del usuario
        module: Nombre del módulo (dashboard, traffic, documents, etc.)
        
    Returns:
        bool: True si puede acceder, False en caso contrario
    """
    module_permissions = {
        'documents': Permission.VIEW_DOCUMENTS,
        'orders': Permission.VIEW_ORDERS,
        'vacations': Permission.VIEW_VACATIONS,
        'traffic': Permission.VIEW_TRAFFIC,
        'users': Permission.VIEW_ALL_USERS,
        'settings': Permission.VIEW_SYSTEM_SETTINGS,
        'gestor': Permission.VIEW_ADMIN_DASHBOARD,
    }
    
    required_permission = module_permissions.get(module)
    if not required_permission:
        return False
        
    return has_permission(user_role, required_permission)

# Decorator para verificar permisos en endpoints
from functools import wraps
from fastapi import HTTPException, status
from app.models.user import User

def require_permission(permission: Permission):
    """
    Decorator para verificar permisos en endpoints de FastAPI.
    
    Args:
        permission: Permiso requerido
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Buscar el usuario actual en los argumentos
            current_user = None
            for arg in args:
                if isinstance(arg, User):
                    current_user = arg
                    break
            
            # Buscar en kwargs
            if not current_user:
                current_user = kwargs.get('current_user')
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Usuario no autenticado"
                )
            
            if not has_permission(current_user.role, permission):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes permisos para realizar esta acción"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def require_role(*allowed_roles: UserRole):
    """
    Decorator para verificar roles específicos en endpoints.
    
    Args:
        allowed_roles: Roles permitidos
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = None
            for arg in args:
                if isinstance(arg, User):
                    current_user = arg
                    break
            
            if not current_user:
                current_user = kwargs.get('current_user')
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Usuario no autenticado"
                )
            
            if current_user.role not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes el rol necesario para acceder a este recurso"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator
