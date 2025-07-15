from passlib.context import CryptContext
from passlib.hash import bcrypt
import os
import shutil
from pathlib import Path
from app.config import settings

# Configuración de hashing de contraseñas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """
    Genera un hash seguro de la contraseña.
    
    Args:
        password: Contraseña en texto plano
        
    Returns:
        Hash de la contraseña
    """
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica si una contraseña coincide con su hash.
    
    Args:
        plain_password: Contraseña en texto plano
        hashed_password: Hash de la contraseña
        
    Returns:
        True si la contraseña es correcta, False en caso contrario
    """
    return pwd_context.verify(plain_password, hashed_password)

def create_user_folder(dni_nie: str) -> str:
    """
    Crea la estructura de carpetas para un nuevo usuario.
    
    Args:
        dni_nie: DNI o NIE del usuario
        
    Returns:
        Ruta de la carpeta del usuario
        
    Raises:
        OSError: Si no se puede crear la carpeta
    """
    # Sanitizar el DNI/NIE para usarlo como nombre de carpeta
    safe_dni = dni_nie.upper().replace("/", "_").replace("\\", "_")
    
    # Crear ruta de la carpeta del usuario
    user_folder = Path(settings.user_files_base_path) / safe_dni
    
    try:
        # Crear carpeta principal del usuario
        user_folder.mkdir(parents=True, exist_ok=True)
        
        # Crear subcarpetas estándar
        subcarpetas = [
            "documentos",
            "nominas", 
            "dietas",
            "contratos",
            "formacion",
            "vacaciones",
            "otros"
        ]
        
        for subcarpeta in subcarpetas:
            (user_folder / subcarpeta).mkdir(exist_ok=True)
            
        # Crear archivo de información del usuario
        info_file = user_folder / "info.txt"
        with open(info_file, "w", encoding="utf-8") as f:
            f.write(f"Carpeta personal del usuario: {dni_nie}\n")
            f.write(f"Creada el: {Path().stat().st_ctime}\n")
            f.write("Estructura de carpetas:\n")
            for subcarpeta in subcarpetas:
                f.write(f"  - {subcarpeta}/\n")
                
        return str(user_folder)
        
    except OSError as e:
        raise OSError(f"No se pudo crear la carpeta para el usuario {dni_nie}: {str(e)}")

def delete_user_folder(folder_path: str) -> bool:
    """
    Elimina la carpeta de un usuario y todo su contenido.
    
    Args:
        folder_path: Ruta de la carpeta del usuario
        
    Returns:
        True si se eliminó correctamente, False en caso contrario
    """
    try:
        if os.path.exists(folder_path):
            shutil.rmtree(folder_path)
            return True
        return False
    except Exception as e:
        print(f"Error al eliminar carpeta {folder_path}: {str(e)}")
        return False

def get_user_folder_size(folder_path: str) -> int:
    """
    Calcula el tamaño total de la carpeta de un usuario.
    
    Args:
        folder_path: Ruta de la carpeta del usuario
        
    Returns:
        Tamaño en bytes
    """
    total_size = 0
    try:
        for dirpath, dirnames, filenames in os.walk(folder_path):
            for filename in filenames:
                filepath = os.path.join(dirpath, filename)
                if os.path.exists(filepath):
                    total_size += os.path.getsize(filepath)
    except Exception as e:
        print(f"Error al calcular tamaño de {folder_path}: {str(e)}")
        
    return total_size

def validate_file_upload(filename: str, file_size: int) -> tuple[bool, str]:
    """
    Valida si un archivo puede ser subido según las restricciones configuradas.
    
    Args:
        filename: Nombre del archivo
        file_size: Tamaño del archivo en bytes
        
    Returns:
        Tupla (es_válido, mensaje_error)
    """
    # Verificar extensión
    file_extension = Path(filename).suffix.lower()
    if file_extension not in settings.allowed_extensions:
        return False, f"Extensión {file_extension} no permitida. Extensiones válidas: {', '.join(settings.allowed_extensions)}"
    
    # Verificar tamaño
    if file_size > settings.upload_max_size:
        return False, f"Archivo demasiado grande. Tamaño máximo: {settings.upload_max_size / (1024*1024):.1f}MB"
    
    return True, "Archivo válido"

def sanitize_filename(filename: str) -> str:
    """
    Sanitiza un nombre de archivo para que sea seguro para el sistema de archivos.
    
    Args:
        filename: Nombre original del archivo
        
    Returns:
        Nombre de archivo sanitizado
    """
    # Caracteres no permitidos en nombres de archivo
    invalid_chars = '<>:"/\\|?*'
    
    # Reemplazar caracteres inválidos
    sanitized = filename
    for char in invalid_chars:
        sanitized = sanitized.replace(char, "_")
    
    # Limitar longitud
    name, ext = os.path.splitext(sanitized)
    if len(name) > 200:
        name = name[:200]
    
    return name + ext
