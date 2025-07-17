from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.user import User, UserRole
from app.models.user_schemas import UserCreate, UserUpdate
from app.config import settings
from passlib.context import CryptContext
from typing import Optional, List
import os

# Configuración para hashing de passwords
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserService:
    """Servicio para la gestión de usuarios"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hashea una contraseña"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verifica una contraseña contra su hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def get_user_by_dni(db: Session, dni_nie: str) -> Optional[User]:
        """Obtiene un usuario por su DNI/NIE"""
        return db.query(User).filter(User.dni_nie == dni_nie).first()
    
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        """Obtiene un usuario por su email"""
        return db.query(User).filter(User.email == email).first()
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
        """Obtiene un usuario por su ID"""
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def search_users(db: Session, search_term: str) -> List[User]:
        """Busca usuarios por DNI, email o nombre"""
        return db.query(User).filter(
            or_(
                User.dni_nie.ilike(f"%{search_term}%"),
                User.email.ilike(f"%{search_term}%"),
                User.first_name.ilike(f"%{search_term}%"),
                User.last_name.ilike(f"%{search_term}%")
            )
        ).all()
    
    @staticmethod
    def get_all_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
        """Obtiene todos los usuarios con paginación"""
        return db.query(User).offset(skip).limit(limit).all()
    
    @staticmethod
    def create_user(db: Session, user_create: UserCreate) -> User:
        """
        Crea un nuevo usuario en la base de datos y su carpeta personal
        """
        # Verificar que no exista un usuario con el mismo DNI/NIE o email
        existing_user = UserService.get_user_by_dni(db, user_create.dni_nie)
        if existing_user:
            raise ValueError(f"Ya existe un usuario con DNI/NIE: {user_create.dni_nie}")
        
        existing_email = UserService.get_user_by_email(db, user_create.email)
        if existing_email:
            raise ValueError(f"Ya existe un usuario con email: {user_create.email}")
        
        # Hashear la contraseña
        hashed_password = UserService.hash_password(user_create.password)
        
        # Crear el objeto User
        db_user = User(
            dni_nie=user_create.dni_nie,
            first_name=user_create.first_name,
            last_name=user_create.last_name,
            email=user_create.email,
            phone=user_create.phone,
            role=user_create.role,
            department=user_create.department,
            position=user_create.position,
            hire_date=user_create.hire_date,
            birth_date=user_create.birth_date,
            address=user_create.address,
            city=user_create.city,
            postal_code=user_create.postal_code,
            emergency_contact_name=user_create.emergency_contact_name,
            emergency_contact_phone=user_create.emergency_contact_phone,
            hashed_password=hashed_password,
            is_active=True,
            is_verified=False
        )
        
        # Crear la carpeta del usuario
        try:
            user_folder_path = db_user.create_user_folder(settings.user_files_base_path)
            db_user.user_folder_path = user_folder_path
        except Exception as e:
            raise Exception(f"Error creando carpeta de usuario: {str(e)}")
        
        # Guardar en la base de datos
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        return db_user
    
    @staticmethod
    def update_user(db: Session, user_id: int, user_update: UserUpdate) -> Optional[User]:
        """Actualiza un usuario existente"""
        db_user = UserService.get_user_by_id(db, user_id)
        if not db_user:
            return None
        
        # Actualizar solo los campos proporcionados
        update_data = user_update.dict(exclude_unset=True)
        
        # Si se incluye una nueva contraseña, hashearla
        if "password" in update_data:
            update_data["hashed_password"] = UserService.hash_password(update_data.pop("password"))
        
        for field, value in update_data.items():
            setattr(db_user, field, value)
        
        db.commit()
        db.refresh(db_user)
        return db_user
    
    @staticmethod
    def delete_user(db: Session, user_id: int) -> bool:
        """Desactiva un usuario (soft delete)"""
        db_user = UserService.get_user_by_id(db, user_id)
        if not db_user:
            return False
        
        db_user.is_active = False
        db.commit()
        return True
    
    @staticmethod
    def activate_user(db: Session, user_id: int) -> bool:
        """Activa un usuario"""
        db_user = UserService.get_user_by_id(db, user_id)
        if not db_user:
            return False
        
        db_user.is_active = True
        db.commit()
        return True
    
    @staticmethod
    def verify_user_email(db: Session, user_id: int) -> bool:
        """Marca el email de un usuario como verificado"""
        db_user = UserService.get_user_by_id(db, user_id)
        if not db_user:
            return False
        
        db_user.is_verified = True
        db.commit()
        return True
    
    @staticmethod
    def get_users_by_department(db: Session, department: str) -> List[User]:
        """Obtiene todos los usuarios de un departamento"""
        return db.query(User).filter(User.department == department).all()
    
    @staticmethod
    def get_users_by_role(db: Session, role: UserRole) -> List[User]:
        """Obtiene todos los usuarios de un rol específico"""
        return db.query(User).filter(User.role == role).all()
    
    @staticmethod
    def change_password(db: Session, user_id: int, new_password: str) -> bool:
        """Cambia la contraseña de un usuario"""
        db_user = UserService.get_user_by_id(db, user_id)
        if not db_user:
            return False
        
        # Hashear la nueva contraseña
        hashed_password = UserService.hash_password(new_password)
        db_user.hashed_password = hashed_password
        
        try:
            db.commit()
            return True
        except Exception:
            db.rollback()
            return False
    
    @staticmethod
    def delete_user_permanently(db: Session, user_id: int) -> bool:
        """Elimina un usuario permanentemente de la base de datos y su carpeta"""
        db_user = UserService.get_user_by_id(db, user_id)
        if not db_user:
            return False
        
        try:
            # Eliminar la carpeta del usuario antes de eliminarlo de la BD
            folder_deleted = db_user.delete_user_folder(settings.user_files_base_path)
            if not folder_deleted:
                print(f"Advertencia: No se pudo eliminar la carpeta del usuario {db_user.dni_nie}")
            
            # Eliminar el usuario de la base de datos
            db.delete(db_user)
            db.commit()
            return True
        except Exception as e:
            print(f"Error eliminando usuario permanentemente: {str(e)}")
            db.rollback()
            return False
