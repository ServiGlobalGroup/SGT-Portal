from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base
import enum
import os
from datetime import datetime, timezone
from typing import Optional

class UserRole(enum.Enum):
    MASTER_ADMIN = "MASTER_ADMIN"  # Usuario maestro oculto
    ADMINISTRADOR = "ADMINISTRADOR"
    ADMINISTRACION = "ADMINISTRACION"
    TRAFICO = "TRAFICO"
    TRABAJADOR = "TRABAJADOR"

class MasterAdminUser:
    """
    Usuario maestro que existe únicamente en el código, no en la base de datos.
    Tiene acceso completo e ilimitado a todo el sistema.
    """
    def __init__(self, username: str, email: str, full_name: str):
        self.id = -1  # ID especial que nunca puede existir en la DB
        self.dni_nie = username  # Usamos el username como dni_nie
        self.first_name = "Admin"
        self.last_name = "System"
        self.email = "admin.system@serviglobal.com"  # Email válido para evitar error de validación
        self.phone = "+34000000001"
        self.role = UserRole.MASTER_ADMIN
        self.department = "IT"
        self.position = "Administrador de Sistema"
        self.hire_date = datetime.now(timezone.utc)
        self.birth_date = None
        self.address = "Oficina Central"
        self.city = "Madrid"
        self.postal_code = "28001"
        self.emergency_contact_name = None
        self.emergency_contact_phone = None
        self.is_active = True
        self.is_verified = True
        self.avatar = None
        self.user_folder_path = None
        self.created_at = datetime.now(timezone.utc)
        self.updated_at = datetime.now(timezone.utc)
        self.last_login = None  # Tipo datetime | None
        self.full_name = full_name
        self.initials = "AS"  # Admin System
    
    def __repr__(self):
        return f"<User(dni_nie='{self.dni_nie}', email='{self.email}', name='{self.full_name}')>"

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
    role = Column(Enum(UserRole), nullable=False, default=UserRole.TRABAJADOR, comment="Rol en el sistema")
    department = Column(String(100), nullable=False, comment="Departamento")
    position = Column(String(100), nullable=True, comment="Puesto de trabajo")
    # Identificador de trabajador (solo relevante para rol TRABAJADOR): 'antiguo' | 'nuevo'
    worker_type = Column(String(10), nullable=False, server_default='antiguo', comment="Clasificación del trabajador: antiguo/nuevo")
    
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
    # Forzar cambio de contraseña al primer inicio (o tras reseteo admin)
    must_change_password = Column(Boolean, nullable=False, server_default='0', comment="Debe cambiar contraseña en próximo login")
    
    def __repr__(self):
        return f"<User(dni_nie='{self.dni_nie}', email='{self.email}', name='{self.first_name} {self.last_name}')>"
    @property
    def full_name(self):
        """Retorna el nombre completo del usuario"""
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def initials(self):
        """Retorna las iniciales del usuario para el avatar"""
        first_initial = (self.first_name or '')[:1].upper()
        last_initial = (self.last_name or '')[:1].upper()
        return f"{first_initial}{last_initial}"
    
    def create_user_folder(self, base_path: str) -> str:
        """
        Crea la carpeta personal del usuario basada en su DNI/NIE.
        Estructura optimizada para conductores y personal de transporte.
        Retorna la ruta de la carpeta creada.
        """
        # Sanitizar el DNI/NIE para usar como nombre de carpeta
        folder_name = self.dni_nie.replace("/", "_").replace("\\", "_")
        user_folder = os.path.join(base_path, folder_name)
        
        # Crear las subcarpetas necesarias según el rol del usuario
        base_folders = [
            user_folder,
            os.path.join(user_folder, "documentos_personales"),  # DNI, pasaporte, etc.
            os.path.join(user_folder, "nominas"),               # Nóminas mensuales
            os.path.join(user_folder, "dietas"),                # Dietas de viaje
            os.path.join(user_folder, "contratos"),             # Contratos laborales
            os.path.join(user_folder, "vacaciones"),            # Solicitudes de vacaciones
            os.path.join(user_folder, "permisos"),              # Permisos y ausencias
        ]
        
        # Carpetas específicas para conductores
        if self.role.name == 'TRABAJADOR':
            conductor_folders = [
                os.path.join(user_folder, "licencias_conducir"),    # Carnet de conducir
                os.path.join(user_folder, "formacion_conductor"),   # CAP, ADR, etc.
                os.path.join(user_folder, "certificados_medicos"), # Reconocimientos médicos
                os.path.join(user_folder, "multas_infracciones"),  # Multas e infracciones
                os.path.join(user_folder, "tacografo"),            # Registros del tacógrafo
                os.path.join(user_folder, "vehiculos_asignados"),  # Documentación vehículos
            ]
            base_folders.extend(conductor_folders)
        
        # Carpetas específicas para personal de tráfico
        elif self.role.name == 'TRAFICO':
            trafico_folders = [
                os.path.join(user_folder, "planificacion"),        # Planificación de rutas
                os.path.join(user_folder, "documentos_carga"),     # CMR, albaranes, etc.
                os.path.join(user_folder, "clientes"),             # Documentación clientes
            ]
            base_folders.extend(trafico_folders)
        
        # Carpetas específicas para administradores
        elif self.role.name == 'ADMINISTRADOR':
            admin_folders = [
                os.path.join(user_folder, "reportes"),             # Reportes y análisis
                os.path.join(user_folder, "configuracion"),       # Archivos de configuración
                os.path.join(user_folder, "backups"),             # Copias de seguridad
            ]
            base_folders.extend(admin_folders)
        
        # Crear todas las carpetas
        for folder in base_folders:
            os.makedirs(folder, exist_ok=True)
        
        # Crear archivo README con información de la estructura
        readme_path = os.path.join(user_folder, "README.txt")
        try:
            with open(readme_path, "w", encoding="utf-8") as f:
                f.write(f"CARPETA PERSONAL - {self.first_name} {self.last_name}\n")
                f.write(f"DNI/NIE: {self.dni_nie}\n")
                f.write(f"Rol: {self.role.name}\n")
                f.write(f"Departamento: {self.department}\n")
                f.write(f"Creado: {datetime.now().strftime('%d/%m/%Y %H:%M')}\n\n")
                f.write("ESTRUCTURA DE CARPETAS:\n")
                f.write("========================\n")
                
                # Documentar las carpetas creadas
                for folder in sorted(base_folders):
                    if folder != user_folder:  # Excluir la carpeta raíz
                        subfolder_name = os.path.basename(folder)
                        f.write(f"📁 {subfolder_name}/\n")
                        
                        # Añadir descripción de cada carpeta
                        descriptions = {
                            "documentos_personales": "  → DNI, pasaporte, documentos de identidad",
                            "nominas": "  → Nóminas mensuales en formato PDF",
                            "dietas": "  → Dietas de viaje y gastos",
                            "contratos": "  → Contratos laborales y anexos",
                            "vacaciones": "  → Solicitudes de vacaciones y permisos",
                            "permisos": "  → Permisos médicos, personales, etc.",
                            "licencias_conducir": "  → Carnet de conducir y renovaciones",
                            "formacion_conductor": "  → CAP, ADR, cursos de formación",
                            "certificados_medicos": "  → Reconocimientos médicos obligatorios",
                            "multas_infracciones": "  → Multas de tráfico e infracciones",
                            "tacografo": "  → Registros y descargas del tacógrafo",
                            "vehiculos_asignados": "  → ITV, seguros, fichas técnicas",
                            "planificacion": "  → Rutas, horarios, planificación",
                            "documentos_carga": "  → CMR, albaranes, documentos de carga",
                            "clientes": "  → Contactos y documentos de clientes",
                            "reportes": "  → Informes y análisis administrativos",
                            "configuracion": "  → Archivos de configuración del sistema",
                            "backups": "  → Copias de seguridad y respaldos"
                        }
                        
                        if subfolder_name in descriptions:
                            f.write(f"{descriptions[subfolder_name]}\n")
                        f.write("\n")
                
                f.write("\nNOTAS:\n")
                f.write("- Mantén los archivos organizados en sus carpetas correspondientes\n")
                f.write("- Los archivos PDF son preferibles para documentos oficiales\n")
                f.write("- Nombres de archivo descriptivos y con fecha cuando sea relevante\n")
                f.write("- No elimines este archivo README\n")
                
        except Exception as e:
            print(f"Error creando README para usuario {self.dni_nie}: {str(e)}")
        
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
    
    # Relaciones
    vacation_requests = relationship("VacationRequest", foreign_keys="VacationRequest.user_id", back_populates="user")

class UploadHistory(Base):
    """
    Modelo para el historial de subidas de documentos.
    Registra cada procesamiento de archivos PDF (nóminas/dietas).
    """
    __tablename__ = "upload_history"
    
    # Identificador
    id = Column(Integer, primary_key=True, index=True)
    
    # Información del archivo
    file_name = Column(String(255), nullable=False, comment="Nombre del archivo subido")
    upload_date = Column(DateTime, nullable=False, comment="Fecha y hora de subida")
    
    # Información del usuario
    user_dni = Column(String(20), nullable=False, index=True, comment="DNI/NIE del usuario que subió")
    user_name = Column(String(200), nullable=False, comment="Nombre completo del usuario")
    
    # Información del documento
    document_type = Column(String(20), nullable=False, comment="Tipo de documento: nominas/dietas")
    month = Column(String(2), nullable=False, comment="Mes del documento")
    year = Column(String(4), nullable=False, comment="Año del documento")
    
    # Estadísticas del procesamiento
    total_pages = Column(Integer, nullable=False, default=0, comment="Total de páginas procesadas")
    successful_pages = Column(Integer, nullable=False, default=0, comment="Páginas procesadas exitosamente")
    failed_pages = Column(Integer, nullable=False, default=0, comment="Páginas que fallaron")
    
    # Estado del procesamiento
    status = Column(String(20), nullable=False, default="processing", comment="Estado: processing/completed/error")
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=func.now(), comment="Fecha de creación")
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now(), comment="Fecha de actualización")
