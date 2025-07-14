from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

router = APIRouter()

class UserProfile(BaseModel):
    id: int
    dni_nie: str
    first_name: str
    last_name: str
    email: str
    phone: str
    role: str  # 'admin', 'manager', 'employee'
    department: str
    position: str
    hire_date: str
    birth_date: str
    address: str
    city: str
    postal_code: str
    emergency_contact_name: str
    emergency_contact_phone: str
    avatar: Optional[str] = None
    is_active: bool = True
    created_at: str
    updated_at: str

class UserProfileUpdate(BaseModel):
    dni_nie: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    hire_date: Optional[str] = None
    birth_date: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

# Datos simulados del perfil (en una implementación real vendría de la base de datos)
user_profile_data = {
    "id": 1001,
    "dni_nie": "12345678Z",
    "first_name": "Juan Carlos",
    "last_name": "Pérez González",
    "email": "juan.perez@empresa.com",
    "phone": "+34 666 123 456",
    "role": "manager",
    "department": "Recursos Humanos",
    "position": "Gerente de RRHH",
    "hire_date": "2020-03-15",
    "birth_date": "1985-07-22",
    "address": "Calle Mayor, 123, 2º A",
    "city": "Madrid",
    "postal_code": "28001",
    "emergency_contact_name": "María Pérez",
    "emergency_contact_phone": "+34 666 987 654",
    "avatar": "JC",
    "is_active": True,
    "created_at": "2020-03-15T10:00:00Z",
    "updated_at": "2025-07-14T15:30:00Z"
}

@router.get("/profile", response_model=UserProfile)
async def get_user_profile():
    """
    Obtener el perfil del usuario autenticado.
    En una implementación real, se obtendría el ID del usuario desde el token JWT.
    """
    return user_profile_data

@router.put("/profile", response_model=UserProfile)
async def update_user_profile(profile_update: UserProfileUpdate):
    """
    Actualizar el perfil del usuario autenticado.
    """
    global user_profile_data
    
    # Actualizar campos proporcionados
    update_data = profile_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field in user_profile_data:
            user_profile_data[field] = value
    
    # Actualizar timestamp de modificación
    user_profile_data["updated_at"] = datetime.now().isoformat()
    
    return user_profile_data

@router.post("/profile/avatar")
async def update_avatar():
    """
    Actualizar avatar del usuario.
    En una implementación real manejaría la subida de archivos.
    """
    global user_profile_data
    
    # Simular cambio de avatar
    user_profile_data["updated_at"] = datetime.now().isoformat()
    
    return {
        "message": "Avatar actualizado correctamente",
        "timestamp": user_profile_data["updated_at"]
    }

@router.get("/profile/stats")
async def get_profile_stats():
    """
    Obtener estadísticas del perfil del usuario.
    """
    hire_date = datetime.strptime(user_profile_data["hire_date"], "%Y-%m-%d")
    today = datetime.now()
    years_worked = today.year - hire_date.year
    if today.month < hire_date.month or (today.month == hire_date.month and today.day < hire_date.day):
        years_worked -= 1
    
    birth_date = datetime.strptime(user_profile_data["birth_date"], "%Y-%m-%d")
    age = today.year - birth_date.year
    if today.month < birth_date.month or (today.month == birth_date.month and today.day < birth_date.day):
        age -= 1
    
    return {
        "years_worked": years_worked,
        "age": age,
        "days_until_birthday": _days_until_birthday(birth_date),
        "work_anniversary": _days_until_work_anniversary(hire_date)
    }

def _days_until_birthday(birth_date: datetime) -> int:
    """Calcular días hasta el próximo cumpleaños"""
    today = datetime.now()
    this_year_birthday = birth_date.replace(year=today.year)
    
    if this_year_birthday < today:
        next_birthday = birth_date.replace(year=today.year + 1)
    else:
        next_birthday = this_year_birthday
    
    return (next_birthday - today).days

def _days_until_work_anniversary(hire_date: datetime) -> int:
    """Calcular días hasta el próximo aniversario laboral"""
    today = datetime.now()
    this_year_anniversary = hire_date.replace(year=today.year)
    
    if this_year_anniversary < today:
        next_anniversary = hire_date.replace(year=today.year + 1)
    else:
        next_anniversary = this_year_anniversary
    
    return (next_anniversary - today).days
