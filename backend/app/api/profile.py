from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.api.auth import get_current_user, user_to_response
from app.models.user import User, MasterAdminUser
from app.models.user_schemas import UserResponse

router = APIRouter()

@router.get("/profile", response_model=UserResponse)
async def get_user_profile(current_user: User | MasterAdminUser = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Obtener el perfil del usuario autenticado.
    Para el usuario maestro, muestra toda la información disponible.
    """
    # Usar la función user_to_response para convertir correctamente el usuario
    is_master = isinstance(current_user, MasterAdminUser)
    return user_to_response(current_user, is_master)

@router.get("/profile/stats")
async def get_profile_stats(current_user: User | MasterAdminUser = Depends(get_current_user)):
    """
    Obtener estadísticas del perfil del usuario.
    Para el usuario maestro, muestra información especial indicando acceso completo.
    """
    if isinstance(current_user, MasterAdminUser):
        # Estadísticas especiales para el usuario maestro
        return {
            "user_type": "master_admin",
            "unlimited_access": True,
            "years_worked": "Sistema",
            "age": "N/A", 
            "days_until_birthday": "N/A",
            "work_anniversary": "Sistema permanente",
            "special_permissions": ["UNLIMITED_ACCESS", "VIEW_ALL_DATA", "MODIFY_ALL_DATA", "DELETE_ALL_DATA"],
            "message": "Usuario maestro con acceso completo al sistema"
        }
    
    # Para usuarios regulares, estadísticas básicas
    return {
        "user_type": "regular",
        "unlimited_access": False,
        "message": "Usuario estándar"
    }
