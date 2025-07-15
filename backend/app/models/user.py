from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Enum
from sqlalchemy.sql import func
from app.database.connection import Base
import enum
import os

class UserRole(enum.Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    EMPLOYEE = "EMPLOYEE"

class User(Base):
    """
    Modelo de usuario principal.
    Utiliza DNI/NIE como identificador único principal.
    """
    __tablename__ = "users"
    
    # Identificadores
    id = Column(Integer, primary_key=True, index=True)
    dni_nie = Column(String(20), unique=True, index=True, nullable=False, comment="DNI o NIE del usuario")
    
    # Datos personales
    first_name = Column(String(100), nullable=False, comment="Nombre")
    last_name = Column(String(100), nullable=False, comment="Apellidos")
    email = Column(String(255), unique=True, index=True, nullable=False, comment="Email corporativo")
    phone = Column(String(20), nullable=True, comment="Teléfono")
    
    # Datos profesionales
    role = Column(Enum(UserRole), nullable=False, default=UserRole.EMPLOYEE, comment="Rol en el sistema")
    department = Column(String(100), nullable=False, comment="Departamento")
    position = Column(String(100), nullable=True, comment="Puesto de trabajo")
    
    # Fechas importantes
    hire_date = Column(DateTime, nullable=True, comment="Fecha de contratación")
    birth_date = Column(DateTime, nullable=True, comment="Fecha de nacimiento")
    
    # Datos de contacto adicionales
    address = Column(Text, nullable=True, comment="Dirección completa")
    city = Column(String(100), nullable=True, comment="Ciudad")
    postal_code = Column(String(10), nullable=True, comment="Código postal")
    
    # Contacto de emergencia
    emergency_contact_name = Column(String(200), nullable=True, comment="Nombre contacto emergencia")
    emergency_contact_phone = Column(String(20), nullable=True, comment="Teléfono contacto emergencia")
    
    # Configuración de cuenta
    hashed_password = Column(String(255), nullable=False, comment="Password hasheado")
    is_active = Column(Boolean, default=True, nullable=False, comment="Usuario activo")
    is_verified = Column(Boolean, default=False, nullable=False, comment="Email verificado")
    avatar = Column(String(255), nullable=True, comment="Ruta al avatar del usuario")
    
    # Configuración de archivos
    user_folder_path = Column(String(500), nullable=True, comment="Ruta a la carpeta personal del usuario")
    
    # Metadatos
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="Fecha de creación")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), comment="Fecha de última actualización")
    last_login = Column(DateTime(timezone=True), nullable=True, comment="Último inicio de sesión")
    
    def __repr__(self):
        return f"<User(dni_nie='{self.dni_nie}', email='{self.email}', name='{self.first_name} {self.last_name}')>"
    
    @property
    def full_name(self):
        """Retorna el nombre completo del usuario"""
        return f"{self.first_name} {self.last_name}"
    
    @property
    def initials(self):
        """Retorna las iniciales del usuario para el avatar"""
        first_initial = self.first_name[0].upper() if self.first_name else ""
        last_initial = self.last_name[0].upper() if self.last_name else ""
        return f"{first_initial}{last_initial}"
    
    def create_user_folder(self, base_path: str) -> str:
        """
        Crea la carpeta personal del usuario basada en su DNI/NIE.
        Retorna la ruta de la carpeta creada.
        """
        # Sanitizar el DNI/NIE para usar como nombre de carpeta
        folder_name = self.dni_nie.replace("/", "_").replace("\\", "_")
        user_folder = os.path.join(base_path, folder_name)
        
        # Crear las subcarpetas necesarias
        folders_to_create = [
            user_folder,
            os.path.join(user_folder, "documentos"),
            os.path.join(user_folder, "nominas"),
            os.path.join(user_folder, "vacaciones"),
            os.path.join(user_folder, "permisos"),
            os.path.join(user_folder, "circulacion"),
            os.path.join(user_folder, "perfil")
        ]
        
        for folder in folders_to_create:
            os.makedirs(folder, exist_ok=True)
        
        return user_folder

    def delete_user_folder(self, base_path: str) -> bool:
        """
        Elimina la carpeta personal del usuario y todo su contenido.
        Retorna True si se eliminó correctamente, False en caso contrario.
        """
        import shutil
        
        # Construir la ruta de la carpeta del usuario
        folder_name = self.dni_nie.replace("/", "_").replace("\\", "_")
        user_folder = os.path.join(base_path, folder_name)
        
        try:
            if os.path.exists(user_folder):
                shutil.rmtree(user_folder)
                return True
            return True  # Si no existe, consideramos que ya está "eliminada"
        except Exception as e:
            print(f"Error eliminando carpeta del usuario {self.dni_nie}: {str(e)}")
            return False
