from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from typing import Optional
from datetime import datetime
from app.models.user import UserRole, UserStatus
from app.models.company_enum import Company
from app.utils.dni_validation import validate_dni_nie_format, sanitize_dni_nie_for_login

# Esquemas base
class UserBase(BaseModel):
    """Esquema base para usuario con campos comunes"""
    dni_nie: str = Field(..., min_length=2, max_length=20, description="DNI o NIE")
    first_name: str = Field(..., min_length=2, max_length=100, description="Nombre")
    last_name: str = Field(..., min_length=2, max_length=100, description="Apellidos")
    email: EmailStr = Field(..., description="Email corporativo")
    phone: Optional[str] = Field(None, max_length=20, description="Teléfono")
    department: str = Field(..., min_length=2, max_length=100, description="Departamento")
    position: Optional[str] = Field(None, max_length=100, description="Puesto de trabajo")
    role: UserRole = Field(default=UserRole.TRABAJADOR, description="Rol del usuario")
    worker_type: str = Field(default="antiguo", pattern="^(antiguo|nuevo)$", description="Clasificación del trabajador (antiguo/nuevo)")
    
    @field_validator('dni_nie')
    @classmethod
    def validate_dni_nie(cls, v: str) -> str:
        """
        Valida el formato del DNI/NIE con excepción para usuarios especiales.
        """
        v = sanitize_dni_nie_for_login(v)
        if not validate_dni_nie_format(v):
            raise ValueError('DNI/NIE no válido')
        return v

# Esquemas para creación
class UserCreate(UserBase):
    """Esquema para crear un nuevo usuario"""
    password: str = Field(..., min_length=8, description="Contraseña")
    hire_date: Optional[datetime] = Field(None, description="Fecha de contratación")
    birth_date: Optional[datetime] = Field(None, description="Fecha de nacimiento")
    address: Optional[str] = Field(None, description="Dirección completa")
    city: Optional[str] = Field(None, max_length=100, description="Ciudad")
    postal_code: Optional[str] = Field(None, max_length=10, description="Código postal")
    emergency_contact_name: Optional[str] = Field(None, max_length=200, description="Nombre contacto emergencia")
    emergency_contact_phone: Optional[str] = Field(None, max_length=20, description="Teléfono contacto emergencia")

# Esquemas para actualización
class UserUpdate(BaseModel):
    """Esquema para actualizar un usuario existente"""
    first_name: Optional[str] = Field(None, min_length=2, max_length=100)
    last_name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    department: Optional[str] = Field(None, min_length=2, max_length=100)
    position: Optional[str] = Field(None, max_length=100)
    role: Optional[UserRole] = None
    worker_type: Optional[str] = Field(None, pattern="^(antiguo|nuevo)$")
    hire_date: Optional[datetime] = None
    birth_date: Optional[datetime] = None
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=10)
    emergency_contact_name: Optional[str] = Field(None, max_length=200)
    emergency_contact_phone: Optional[str] = Field(None, max_length=20)
    status: Optional[UserStatus] = None
    company: Optional[Company] = None

# Esquemas de respuesta
class UserResponseBase(BaseModel):
    """Esquema base para respuestas de usuario sin validaciones estrictas"""
    dni_nie: str = Field(..., description="DNI o NIE del usuario")
    first_name: str = Field(..., min_length=2, max_length=100, description="Nombre")
    last_name: str = Field(..., min_length=2, max_length=100, description="Apellidos")
    email: EmailStr = Field(..., description="Correo electrónico")
    phone: Optional[str] = Field(None, max_length=20, description="Teléfono")
    department: str = Field(..., min_length=2, max_length=100, description="Departamento")
    position: str = Field(..., max_length=100, description="Cargo/Posición")
    role: UserRole = Field(..., description="Rol del usuario")
    worker_type: Optional[str] = Field(None, pattern="^(antiguo|nuevo)$", description="Tipo trabajador")
    company: Optional[Company] = Field(None, description="Empresa asociada")

class UserResponse(UserResponseBase):
    """Esquema de respuesta con información completa del usuario"""
    id: int
    hire_date: Optional[datetime] = None
    birth_date: Optional[datetime] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    status: UserStatus
    is_verified: bool
    avatar: Optional[str] = None
    user_folder_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
    must_change_password: bool | None = False
    
    # Propiedades calculadas
    full_name: str = Field(..., description="Nombre completo")
    initials: str = Field(..., description="Iniciales para avatar")
    
    # Propiedad de compatibilidad
    @property
    def is_active(self) -> bool:
        """Propiedad de compatibilidad: retorna True si el usuario está ACTIVO o en BAJA"""
        return self.status in (UserStatus.ACTIVO, UserStatus.BAJA)
    
    model_config = ConfigDict(from_attributes=True)

class UserList(BaseModel):
    """Esquema para listar usuarios (información reducida)"""
    id: int
    dni_nie: str
    first_name: str
    last_name: str
    email: EmailStr
    department: str
    position: Optional[str] = None
    role: UserRole
    worker_type: str = Field(..., pattern="^(antiguo|nuevo)$")
    status: UserStatus
    last_login: Optional[datetime] = None
    created_at: datetime
    # Nuevo: incluir empresa para que el frontend pueda reabrir el modal con el valor actual
    company: Optional[Company] = Field(None, description="Empresa asociada")
    
    # Propiedades calculadas
    full_name: str
    initials: str
    
    # Propiedad de compatibilidad
    @property
    def is_active(self) -> bool:
        """Propiedad de compatibilidad: retorna True si el usuario está ACTIVO o en BAJA"""
        return self.status in (UserStatus.ACTIVO, UserStatus.BAJA)
    
    model_config = ConfigDict(from_attributes=True)

# Esquemas para autenticación
class UserLogin(BaseModel):
    """Esquema para login de usuario"""
    dni_nie: str = Field(..., description="DNI/NIE o email del usuario")
    password: str = Field(..., description="Contraseña")
    
    @field_validator('dni_nie')
    @classmethod
    def sanitize_dni_nie_login(cls, v: str) -> str:
        """
        Sanitiza el DNI/NIE para login, preservando usuarios especiales.
        """
        return sanitize_dni_nie_for_login(v)

class Token(BaseModel):
    """Esquema para respuesta de token"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class TokenData(BaseModel):
    """Esquema para datos del token"""
    dni_nie: Optional[str] = None

# Esquemas para cambio de contraseña
class PasswordChange(BaseModel):
    """Esquema para cambio de contraseña"""
    current_password: str = Field(..., description="Contraseña actual")
    new_password: str = Field(..., min_length=8, description="Nueva contraseña")

class AdminPasswordReset(BaseModel):
    """Esquema para reseteo de contraseña por administrador"""
    # Ya no se requieren campos de contraseña - se asigna automáticamente "12345678"
    pass

class PasswordReset(BaseModel):
    """Esquema para reseteo de contraseña"""
    dni_nie: str = Field(..., description="DNI/NIE del usuario")
    
class PasswordResetConfirm(BaseModel):
    """Esquema para confirmar reseteo de contraseña"""
    token: str = Field(..., description="Token de reseteo")
    new_password: str = Field(..., min_length=8, description="Nueva contraseña")

# Esquemas de respuesta para listas
class UserListResponse(BaseModel):
    """Respuesta paginada para lista de usuarios"""
    users: list[UserList]
    total: int
    page: int
    per_page: int
    total_pages: int
