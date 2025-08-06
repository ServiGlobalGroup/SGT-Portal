"""
Utilidades para validación de DNI/NIE con excepción para usuario maestro
"""
import re
from typing import Union

def is_master_admin_user(dni_nie: str) -> bool:
    """
    Verifica si un DNI/NIE corresponde al usuario maestro.
    
    Args:
        dni_nie: DNI/NIE a verificar
        
    Returns:
        bool: True si es el usuario maestro
    """
    # Lista de identificadores posibles para el usuario maestro
    master_identifiers = [
        "admin01",
        "ADMIN01", 
        "sys_admin",
        "root",
        "system",
    ]
    
    return dni_nie.lower() in [id.lower() for id in master_identifiers]

def validate_dni_nie_format(dni_nie: str) -> bool:
    """
    Valida el formato de un DNI/NIE español.
    Hace excepción para el usuario maestro.
    
    Args:
        dni_nie: DNI/NIE a validar
        
    Returns:
        bool: True si es válido o es el usuario maestro
    """
    # Si es el usuario maestro, no validar formato
    if is_master_admin_user(dni_nie):
        return True
    
    # Validación normal para DNI/NIE
    dni_nie = dni_nie.upper().strip()
    
    # Patrón para DNI: 8 dígitos + letra
    dni_pattern = r'^\d{8}[A-Z]$'
    
    # Patrón para NIE: X/Y/Z + 7 dígitos + letra
    nie_pattern = r'^[XYZ]\d{7}[A-Z]$'
    
    if re.match(dni_pattern, dni_nie):
        return validate_dni_letter(dni_nie)
    elif re.match(nie_pattern, dni_nie):
        return validate_nie_letter(dni_nie)
    
    return False

def validate_dni_letter(dni: str) -> bool:
    """
    Valida la letra del DNI según el algoritmo oficial.
    
    Args:
        dni: DNI a validar
        
    Returns:
        bool: True si la letra es correcta
    """
    if len(dni) != 9:
        return False
        
    letters = "TRWAGMYFPDXBNJZSQVHLCKE"
    numbers = dni[:8]
    letter = dni[8]
    
    try:
        calculated_letter = letters[int(numbers) % 23]
        return letter == calculated_letter
    except (ValueError, IndexError):
        return False

def validate_nie_letter(nie: str) -> bool:
    """
    Valida la letra del NIE según el algoritmo oficial.
    
    Args:
        nie: NIE a validar
        
    Returns:
        bool: True si la letra es correcta
    """
    if len(nie) != 9:
        return False
        
    # Convertir primera letra a número
    first_letter_to_number = {'X': '0', 'Y': '1', 'Z': '2'}
    first_letter = nie[0]
    
    if first_letter not in first_letter_to_number:
        return False
        
    # Reemplazar primera letra por número
    numbers = first_letter_to_number[first_letter] + nie[1:8]
    letter = nie[8]
    
    letters = "TRWAGMYFPDXBNJZSQVHLCKE"
    
    try:
        calculated_letter = letters[int(numbers) % 23]
        return letter == calculated_letter
    except (ValueError, IndexError):
        return False

def sanitize_dni_nie_for_login(dni_nie: str) -> str:
    """
    Sanitiza un DNI/NIE para login, manteniendo el formato del usuario maestro.
    
    Args:
        dni_nie: DNI/NIE a sanitizar
        
    Returns:
        str: DNI/NIE sanitizado
    """
    # Si es el usuario maestro, no modificar
    if is_master_admin_user(dni_nie):
        return dni_nie.strip()
        
    # Para DNI/NIE normales, convertir a mayúsculas y limpiar
    return dni_nie.upper().strip()
