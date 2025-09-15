from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from app.database.connection import get_db
from app.models.user import User, MasterAdminUser, UserRole, UserStatus
from app.services.activity_service import ActivityService
from app.models.user_schemas import UserLogin, Token, TokenData, UserResponse
from app.services.user_service import UserService
from app.config import settings

router = APIRouter()

# Configuración OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def create_master_admin_user() -> MasterAdminUser:
    """
    Crea el usuario maestro con las credenciales del archivo de configuración.
    Este usuario nunca se guarda en la base de datos.
    """
    return MasterAdminUser(
        username=settings.master_admin_username,
        email="admin.system@serviglobal.com",  # Email válido hardcodeado
        full_name=settings.master_admin_name
    )

def verify_master_admin_password(password: str) -> bool:
    """
    Verifica si la contraseña coincide con la del usuario maestro.
    """
    return password == settings.master_admin_password

def user_to_response(user, is_master=False) -> UserResponse:
    """
    Convierte un usuario (normal o maestro) a UserResponse.
    """
    if is_master:
        # Usuario maestro - acceso directo a propiedades (sin problemas de Column)
        return UserResponse(
            id=user.id,
            dni_nie=user.dni_nie,
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            phone=user.phone,
            role=user.role,
            department=user.department,
            position=user.position,
            hire_date=user.hire_date,
            birth_date=user.birth_date,
            address=user.address,
            city=user.city,
            postal_code=user.postal_code,
            emergency_contact_name=user.emergency_contact_name,
            emergency_contact_phone=user.emergency_contact_phone,
            status=user.status,
<<<<<<< HEAD
=======
            is_active=user.is_active,
>>>>>>> 66167b7fd64549b4bab8bfb1cbc32f377e50f9d7
            is_verified=user.is_verified,
            avatar=user.avatar,
            user_folder_path="",  # Sin carpeta física
            created_at=user.created_at,
            updated_at=user.updated_at,
            last_login=user.last_login,
            full_name=user.full_name,
            initials=user.initials,
            must_change_password=False
        )
    else:
        # Usuario de BD - usar el método original que funciona
        full_name = f"{user.first_name} {user.last_name}"
        initials = f"{user.first_name[0].upper()}{user.last_name[0].upper()}" if user.first_name and user.last_name else "XX"
        
        user_data = {
            "id": user.id,
            "dni_nie": user.dni_nie,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "department": user.department,
            "position": user.position,
            "hire_date": user.hire_date,
            "birth_date": user.birth_date,
            "address": user.address,
            "city": user.city,
            "postal_code": user.postal_code,
            "emergency_contact_name": user.emergency_contact_name,
            "emergency_contact_phone": user.emergency_contact_phone,
<<<<<<< HEAD
            "status": user.status,
=======
            "status": getattr(user, 'status', UserStatus.ACTIVO),  # Default ACTIVO si no existe
            "is_active": user.is_active,
>>>>>>> 66167b7fd64549b4bab8bfb1cbc32f377e50f9d7
            "is_verified": user.is_verified,
            "avatar": user.avatar,
            "user_folder_path": f"{settings.user_files_base_path}/{user.dni_nie}",
            "created_at": user.created_at,
            "updated_at": user.updated_at,
            "last_login": user.last_login,
            "full_name": full_name,
            "initials": initials,
            "must_change_password": getattr(user, 'must_change_password', False)
        }
        
        return UserResponse(**user_data)

from typing import Optional, Any, cast

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Crea un token JWT de acceso.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Obtiene el usuario actual a partir del token JWT.
    Incluye soporte para el usuario maestro oculto.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        dni_nie = payload.get("sub")  # type: ignore[assignment]
        if dni_nie is None:
            raise credentials_exception
        token_data = TokenData(dni_nie=cast(str, dni_nie))
    except JWTError:
        raise credentials_exception
    
    # Verificar si es el usuario maestro
    if token_data.dni_nie == settings.master_admin_username:
        master_user = create_master_admin_user()
        return master_user
    
    # Usuario normal de la base de datos
    user = UserService.get_user_by_dni(db, dni_nie=cast(str, token_data.dni_nie))
    if user is None:
        raise credentials_exception
    
    # Usar la nueva lógica de can_login que permite ACTIVO y BAJA
    if not user.can_login:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario inactivo"
        )
    
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    """
    Verifica que el usuario actual pueda hacer login (ACTIVO o BAJA).
    """
    # Para usuarios maestros, siempre permitir
    if isinstance(current_user, MasterAdminUser):
        return current_user
    
    # Para usuarios normales, usar can_login
    if not getattr(current_user, 'can_login', True):
        raise HTTPException(status_code=400, detail="Usuario inactivo")
    return current_user

def authenticate_user(db: Session, dni_nie: str, password: str):
    """
    Autentica un usuario por DNI/NIE o email y contraseña.
    Incluye verificación silenciosa del usuario maestro.
    """
    # Verificación silenciosa del usuario maestro (sin logs)
    if dni_nie == settings.master_admin_username:
        if verify_master_admin_password(password):
            return create_master_admin_user()
        else:
            # Retornar False sin logs para mantener secreto
            return False
    
    # Autenticación normal para usuarios de la base de datos
    # Intentar buscar por DNI/NIE primero
    user = UserService.get_user_by_dni(db, dni_nie)
    
    # Si no se encuentra, intentar buscar por email
    if not user:
        user = UserService.get_user_by_email(db, dni_nie)
    
    if not user:
        return False
    
    if not UserService.verify_password(password, cast(str, user.hashed_password)):
        return False
    
    return user

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Endpoint para iniciar sesión con DNI/NIE o email y contraseña.
    Incluye soporte silencioso para usuario especial del sistema.
    """
    user = authenticate_user(db, form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Crear token de acceso
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.dni_nie}, expires_delta=access_token_expires
    )
    
    # Usar la función auxiliar para crear la respuesta
    user_response = user_to_response(user, isinstance(user, MasterAdminUser))
    
    # Registrar actividad (login)
    try:
        ActivityService.log_from_user(
            db,
            user=user,
            event_type=ActivityService.EVENT_LOGIN,
            message="Inició sesión",
            meta={"username": form_data.username},
        )
    except Exception:
        # Evitar que un fallo de logging bloquee login
        pass

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,  # En segundos
        user=user_response
    )

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_active_user)):
    """
    Endpoint para cerrar sesión (en esta implementación solo confirma que el token es válido).
    En una implementación más robusta, se podría mantener una blacklist de tokens.
    """
    return {"message": "Sesión cerrada exitosamente"}

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user = Depends(get_current_active_user)):
    """
    Obtiene la información del usuario actual.
    Funciona tanto para usuarios normales como para el usuario maestro.
    """
    return user_to_response(current_user, isinstance(current_user, MasterAdminUser))

@router.get("/verify-token")
async def verify_token(current_user = Depends(get_current_active_user)):
    """
    Verifica si el token actual es válido.
    """
    is_special = isinstance(current_user, MasterAdminUser)
    return {
        "valid": True,
        "user_id": current_user.id,
        "dni_nie": current_user.dni_nie,
        "role": current_user.role.value if is_special else current_user.role.value,
        "system_user": is_special  # Menos obvio que "is_master"
    }

@router.post("/refresh", response_model=Token)
async def refresh_token(current_user = Depends(get_current_active_user)):
    """Renueva el token de acceso antes de que expire (sesión deslizante).
    Mientras el usuario siga activo y haga peticiones periódicas (o el frontend refresque automáticamente),
    la sesión puede mantenerse indefinidamente. Si se desea mayor seguridad a futuro, sustituir por refresh tokens separados.
    """
    # Emitimos un nuevo access token con la ventana estándar
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    new_token = create_access_token(data={"sub": current_user.dni_nie}, expires_delta=access_token_expires)
    user_response = user_to_response(current_user, isinstance(current_user, MasterAdminUser))
    return Token(
        access_token=new_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60,
        user=user_response
    )

@router.post('/change-password-first')
async def change_password_first(data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """Permite al usuario cambiar su contraseña la primera vez (o cuando el flag must_change_password está activo)."""
    from app.services.user_service import UserService
    current_pwd = data.get('current_password')
    new_pwd = data.get('new_password')
    if not current_pwd or not new_pwd:
        raise HTTPException(status_code=400, detail='Datos incompletos')
    # Validar contraseña actual
    if not UserService.verify_password(current_pwd, current_user.hashed_password):  # type: ignore[arg-type]
        raise HTTPException(status_code=400, detail='Contraseña actual incorrecta')
    if len(new_pwd) < 8:
        raise HTTPException(status_code=400, detail='La nueva contraseña es demasiado corta')
    # Validaciones de fuerza de contraseña
    import re
    if not re.search(r'[A-Z]', new_pwd):
        raise HTTPException(status_code=400, detail='La contraseña debe contener al menos una mayúscula')
    if not re.search(r'[a-z]', new_pwd):
        raise HTTPException(status_code=400, detail='La contraseña debe contener al menos una minúscula')
    if not re.search(r'\d', new_pwd):
        raise HTTPException(status_code=400, detail='La contraseña debe contener al menos un número')
    # Actualizar
    hashed = UserService.hash_password(new_pwd)
    setattr(current_user, 'hashed_password', hashed)
    setattr(current_user, 'must_change_password', False)
    db.commit()
    return {'status':'ok'}
