from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from app.database.connection import get_db
from app.models.user import User
from app.models.user_schemas import UserLogin, Token, TokenData, UserResponse
from app.services.user_service import UserService
from app.config import settings

router = APIRouter()

# Configuración OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def create_access_token(data: dict, expires_delta: timedelta = None):
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
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        dni_nie: str = payload.get("sub")
        if dni_nie is None:
            raise credentials_exception
        token_data = TokenData(dni_nie=dni_nie)
    except JWTError:
        raise credentials_exception
    
    user = UserService.get_user_by_dni(db, dni_nie=token_data.dni_nie)
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario inactivo"
        )
    
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    """
    Verifica que el usuario actual esté activo.
    """
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Usuario inactivo")
    return current_user

def authenticate_user(db: Session, dni_nie: str, password: str):
    """
    Autentica un usuario por DNI/NIE o email y contraseña.
    """
    # Intentar buscar por DNI/NIE primero
    user = UserService.get_user_by_dni(db, dni_nie)
    
    # Si no se encuentra, intentar buscar por email
    if not user:
        user = UserService.get_user_by_email(db, dni_nie)
    
    if not user:
        return False
    
    if not UserService.verify_password(password, user.hashed_password):
        return False
    
    return user

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Endpoint para iniciar sesión con DNI/NIE o email y contraseña.
    """
    user = authenticate_user(db, form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="DNI/NIE o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario inactivo. Contacte con el administrador."
        )
    
    # Actualizar última fecha de login
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    
    # Crear token de acceso
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.dni_nie}, expires_delta=access_token_expires
    )
    
    # Crear respuesta del usuario usando from_attributes
    # Primero calculamos full_name e initials
    full_name = f"{user.first_name} {user.last_name}"
    initials = f"{user.first_name[0].upper()}{user.last_name[0].upper()}"
    
    # Crear el diccionario con los datos del usuario
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
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "avatar": user.avatar,
        "user_folder_path": f"{settings.user_files_base_path}/{user.dni_nie}",
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "last_login": user.last_login,
        "full_name": full_name,
        "initials": initials
    }
    
    user_response = UserResponse(**user_data)
    
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
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """
    Obtiene la información del usuario actual.
    """
    # Crear el diccionario con los datos del usuario
    user_data = {
        "id": current_user.id,
        "dni_nie": current_user.dni_nie,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "role": current_user.role,
        "department": current_user.department,
        "position": current_user.position,
        "hire_date": current_user.hire_date,
        "birth_date": current_user.birth_date,
        "address": current_user.address,
        "city": current_user.city,
        "postal_code": current_user.postal_code,
        "emergency_contact_name": current_user.emergency_contact_name,
        "emergency_contact_phone": current_user.emergency_contact_phone,
        "is_active": current_user.is_active,
        "is_verified": current_user.is_verified,
        "avatar": current_user.avatar,
        "user_folder_path": f"{settings.user_files_base_path}/{current_user.dni_nie}",
        "created_at": current_user.created_at,
        "updated_at": current_user.updated_at,
        "last_login": current_user.last_login,
        "full_name": f"{current_user.first_name} {current_user.last_name}",
        "initials": f"{current_user.first_name[0].upper()}{current_user.last_name[0].upper()}"
    }
    
    return UserResponse(**user_data)

@router.get("/verify-token")
async def verify_token(current_user: User = Depends(get_current_active_user)):
    """
    Verifica si el token actual es válido.
    """
    return {
        "valid": True,
        "user_id": current_user.id,
        "dni_nie": current_user.dni_nie,
        "role": current_user.role.value
    }
