"""
Servicio para gestionar la estructura de carpetas de usuarios.
Incluye funciones para crear, validar y migrar carpetas según roles.
"""

import os
import shutil
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from app.models.user import UserRole
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class FolderStructureService:
    """Servicio para gestionar la estructura de carpetas del sistema"""
    
    # Definición de estructura de carpetas por rol
    FOLDER_STRUCTURES = {
        UserRole.TRABAJADOR: {
            "documentos_personales": "DNI, pasaporte, documentos de identidad",
            "nominas": "Nóminas mensuales en formato PDF",
            "dietas": "Dietas de viaje y gastos",
            "contratos": "Contratos laborales y anexos",
            "vacaciones": "Solicitudes de vacaciones y permisos",
            "permisos": "Permisos médicos, personales, etc.",
            "licencias_conducir": "Carnet de conducir y renovaciones",
            "formacion_conductor": "CAP, ADR, cursos de formación",
            "certificados_medicos": "Reconocimientos médicos obligatorios",
            "multas_infracciones": "Multas de tráfico e infracciones",
            "tacografo": "Registros y descargas del tacógrafo",
            "vehiculos_asignados": "ITV, seguros, fichas técnicas",
        },
        UserRole.P_TALLER: {
            "documentos_personales": "DNI, pasaporte, documentos de identidad",
            "nominas": "Nóminas mensuales en formato PDF",
            "dietas": "Dietas de viaje y gastos",
            "contratos": "Contratos laborales y anexos",
            "vacaciones": "Solicitudes de vacaciones y permisos",
            "permisos": "Permisos médicos, personales, etc.",
            "licencias_conducir": "Carnet de conducir y renovaciones",
            "formacion_conductor": "CAP, ADR, cursos de formación",
            "certificados_medicos": "Reconocimientos médicos obligatorios",
            "multas_infracciones": "Multas de tráfico e infracciones",
            "vehiculos_asignados": "ITV, seguros, fichas técnicas",
            "herramientas_taller": "Inventario y control de herramientas",
            "reparaciones": "Historial de reparaciones y mantenimiento",
            "manuales_tecnicos": "Documentación técnica y manuales",
        },
        UserRole.TRAFICO: {
            "documentos_personales": "DNI, pasaporte, documentos de identidad",
            "nominas": "Nóminas mensuales en formato PDF",
            "dietas": "Dietas de viaje y gastos",
            "contratos": "Contratos laborales y anexos",
            "vacaciones": "Solicitudes de vacaciones y permisos",
            "permisos": "Permisos médicos, personales, etc.",
            "planificacion": "Rutas, horarios, planificación",
            "documentos_carga": "CMR, albaranes, documentos de carga",
            "clientes": "Contactos y documentos de clientes",
        },
        UserRole.ADMINISTRADOR: {
            "documentos_personales": "DNI, pasaporte, documentos de identidad",
            "nominas": "Nóminas mensuales en formato PDF",
            "contratos": "Contratos laborales y anexos",
            "vacaciones": "Solicitudes de vacaciones y permisos",
            "permisos": "Permisos médicos, personales, etc.",
            "reportes": "Informes y análisis administrativos",
            "configuracion": "Archivos de configuración del sistema",
            "backups": "Copias de seguridad y respaldos",
        }
    }
    
    @classmethod
    def create_user_folder_structure(cls, dni_nie: str, role: UserRole, 
                                   first_name: str, last_name: str, 
                                   department: str) -> str:
        """
        Crea la estructura completa de carpetas para un usuario.
        
        Args:
            dni_nie: DNI/NIE del usuario
            role: Rol del usuario
            first_name: Nombre del usuario
            last_name: Apellidos del usuario
            department: Departamento del usuario
            
        Returns:
            Ruta de la carpeta del usuario creada
        """
        # Sanitizar DNI/NIE para nombre de carpeta
        safe_dni = dni_nie.replace("/", "_").replace("\\", "_").replace(":", "_")
        user_folder = Path(settings.user_files_base_path) / safe_dni
        
        try:
            # Crear carpeta principal del usuario
            user_folder.mkdir(parents=True, exist_ok=True)
            
            # Obtener estructura de carpetas según el rol
            folders_structure = cls.FOLDER_STRUCTURES.get(role, cls.FOLDER_STRUCTURES[UserRole.TRABAJADOR])
            
            # Crear todas las subcarpetas
            for folder_name in folders_structure.keys():
                subfolder = user_folder / folder_name
                subfolder.mkdir(exist_ok=True)
                logger.info(f"Creada carpeta: {subfolder}")
            
            # Crear archivo de información del usuario
            cls._create_user_info_file(user_folder, dni_nie, role, first_name, 
                                     last_name, department, folders_structure)
            
            # ⚠️ NO crear archivos .gitkeep automáticamente 
            # Los archivos .gitkeep se gestionan manualmente según necesidades
            # for folder_name in folders_structure.keys():
            #     gitkeep_file = user_folder / folder_name / ".gitkeep"
            #     gitkeep_file.touch()
            
            logger.info(f"Estructura de carpetas creada para usuario {dni_nie}")
            return str(user_folder)
            
        except Exception as e:
            logger.error(f"Error creando carpetas para usuario {dni_nie}: {str(e)}")
            raise Exception(f"No se pudo crear la estructura de carpetas: {str(e)}")
    
    @classmethod
    def _create_user_info_file(cls, user_folder: Path, dni_nie: str, role: UserRole,
                              first_name: str, last_name: str, department: str,
                              folders_structure: Dict[str, str]) -> None:
        """Crea archivo de información y documentación de la estructura"""
        
        info_file = user_folder / "README.txt"
        try:
            with open(info_file, "w", encoding="utf-8") as f:
                f.write("=" * 60 + "\n")
                f.write("CARPETA PERSONAL DE USUARIO - SISTEMA SGT\n")
                f.write("=" * 60 + "\n\n")
                
                f.write("INFORMACIÓN DEL USUARIO:\n")
                f.write("-" * 25 + "\n")
                f.write(f"Nombre completo: {first_name} {last_name}\n")
                f.write(f"DNI/NIE: {dni_nie}\n")
                f.write(f"Rol: {role.name}\n")
                f.write(f"Departamento: {department}\n")
                f.write(f"Carpeta creada: {datetime.now().strftime('%d/%m/%Y a las %H:%M')}\n\n")
                
                f.write("ESTRUCTURA DE CARPETAS:\n")
                f.write("-" * 25 + "\n")
                
                for folder_name, description in folders_structure.items():
                    f.write(f"📁 {folder_name}/\n")
                    f.write(f"   → {description}\n\n")
                
                f.write("INSTRUCCIONES DE USO:\n")
                f.write("-" * 22 + "\n")
                f.write("• Mantén los archivos organizados en sus carpetas correspondientes\n")
                f.write("• Usa nombres de archivo descriptivos y con fecha cuando sea relevante\n")
                f.write("• Los documentos oficiales preferiblemente en formato PDF\n")
                f.write("• Para archivos grandes, considera comprimirlos\n")
                f.write("• No elimines este archivo README\n\n")
                
                f.write("NOTAS IMPORTANTES:\n")
                f.write("-" * 19 + "\n")
                f.write("• Esta carpeta es personal y confidencial\n")
                f.write("• Solo tú y los administradores pueden acceder a ella\n")
                f.write("• Se realizan copias de seguridad periódicas\n")
                f.write("• En caso de problemas, contacta con el administrador del sistema\n\n")
                
                f.write("=" * 60 + "\n")
                f.write("Portal SGT - Sistema de Gestión de Transporte\n")
                f.write("=" * 60 + "\n")
                
        except Exception as e:
            logger.error(f"Error creando archivo README para {dni_nie}: {str(e)}")
    
    @classmethod
    def validate_folder_structure(cls, dni_nie: str, role: UserRole) -> Tuple[bool, List[str]]:
        """
        Valida que la estructura de carpetas de un usuario sea correcta.
        
        Args:
            dni_nie: DNI/NIE del usuario
            role: Rol del usuario
            
        Returns:
            Tuple con (es_válida, lista_carpetas_faltantes)
        """
        safe_dni = dni_nie.replace("/", "_").replace("\\", "_").replace(":", "_")
        user_folder = Path(settings.user_files_base_path) / safe_dni
        
        if not user_folder.exists():
            return False, ["La carpeta del usuario no existe"]
        
        expected_folders = set(cls.FOLDER_STRUCTURES.get(role, cls.FOLDER_STRUCTURES[UserRole.TRABAJADOR]).keys())
        existing_folders = set(d.name for d in user_folder.iterdir() if d.is_dir())
        
        missing_folders = expected_folders - existing_folders
        
        return len(missing_folders) == 0, list(missing_folders)
    
    @classmethod
    def repair_folder_structure(cls, dni_nie: str, role: UserRole, 
                              first_name: str, last_name: str, department: str) -> bool:
        """
        Repara la estructura de carpetas de un usuario creando las carpetas faltantes.
        
        Args:
            dni_nie: DNI/NIE del usuario
            role: Rol del usuario
            first_name: Nombre del usuario
            last_name: Apellidos del usuario
            department: Departamento del usuario
            
        Returns:
            True si la reparación fue exitosa
        """
        try:
            is_valid, missing_folders = cls.validate_folder_structure(dni_nie, role)
            
            if is_valid:
                return True
            
            safe_dni = dni_nie.replace("/", "_").replace("\\", "_").replace(":", "_")
            user_folder = Path(settings.user_files_base_path) / safe_dni
            
            # Crear carpetas faltantes
            folders_structure = cls.FOLDER_STRUCTURES.get(role, cls.FOLDER_STRUCTURES[UserRole.TRABAJADOR])
            
            for folder_name in missing_folders:
                if folder_name in folders_structure:
                    subfolder = user_folder / folder_name
                    subfolder.mkdir(exist_ok=True)
                    # ⚠️ NO crear archivos .gitkeep automáticamente
                    # gitkeep_file = subfolder / ".gitkeep"
                    # gitkeep_file.touch()
                    logger.info(f"Carpeta reparada: {subfolder}")
            
            # Actualizar archivo README si es necesario
            cls._create_user_info_file(user_folder, dni_nie, role, first_name, 
                                     last_name, department, folders_structure)
            
            logger.info(f"Estructura de carpetas reparada para usuario {dni_nie}")
            return True
            
        except Exception as e:
            logger.error(f"Error reparando carpetas para usuario {dni_nie}: {str(e)}")
            return False
    
    @classmethod
    def get_folder_info(cls, dni_nie: str) -> Optional[Dict]:
        """
        Obtiene información sobre las carpetas de un usuario.
        
        Args:
            dni_nie: DNI/NIE del usuario
            
        Returns:
            Diccionario con información de las carpetas o None si no existe
        """
        safe_dni = dni_nie.replace("/", "_").replace("\\", "_").replace(":", "_")
        user_folder = Path(settings.user_files_base_path) / safe_dni
        
        if not user_folder.exists():
            return None
        
        try:
            folder_info = {
                "user_folder": str(user_folder),
                "subfolders": {},
                "total_size": 0,
                "file_count": 0
            }
            
            # Analizar cada subcarpeta
            for item in user_folder.iterdir():
                if item.is_dir():
                    files_in_folder = [f for f in item.iterdir() if f.is_file() and f.name != ".gitkeep"]
                    folder_size = sum(f.stat().st_size for f in files_in_folder)
                    
                    folder_info["subfolders"][item.name] = {
                        "path": str(item),
                        "file_count": len(files_in_folder),
                        "size_bytes": folder_size
                    }
                    
                    folder_info["total_size"] += folder_size
                    folder_info["file_count"] += len(files_in_folder)
            
            return folder_info
            
        except Exception as e:
            logger.error(f"Error obteniendo información de carpetas para {dni_nie}: {str(e)}")
            return None
    
    @classmethod
    def migrate_old_structure(cls, dni_nie: str, role: UserRole, 
                            first_name: str, last_name: str, department: str) -> bool:
        """
        Migra una estructura de carpetas antigua a la nueva estructura.
        
        Args:
            dni_nie: DNI/NIE del usuario
            role: Rol del usuario
            first_name: Nombre del usuario
            last_name: Apellidos del usuario
            department: Departamento del usuario
            
        Returns:
            True si la migración fue exitosa
        """
        safe_dni = dni_nie.replace("/", "_").replace("\\", "_").replace(":", "_")
        user_folder = Path(settings.user_files_base_path) / safe_dni
        
        if not user_folder.exists():
            return False
        
        try:
            # Mapeo de carpetas antiguas a nuevas
            migration_map = {
                "documentos": "documentos_personales",
                "circulacion": "licencias_conducir",
                "perfil": "documentos_personales",
            }
            
            # Mover archivos de carpetas antiguas a nuevas
            for old_name, new_name in migration_map.items():
                old_folder = user_folder / old_name
                new_folder = user_folder / new_name
                
                if old_folder.exists() and old_folder.is_dir():
                    # Crear nueva carpeta si no existe
                    new_folder.mkdir(exist_ok=True)
                    
                    # Mover archivos
                    for file_path in old_folder.iterdir():
                        if file_path.is_file():
                            target_path = new_folder / file_path.name
                            # Si ya existe un archivo con el mismo nombre, renombrarlo
                            if target_path.exists():
                                base_name = target_path.stem
                                extension = target_path.suffix
                                counter = 1
                                while target_path.exists():
                                    target_path = new_folder / f"{base_name}_{counter}{extension}"
                                    counter += 1
                            
                            shutil.move(str(file_path), str(target_path))
                            logger.info(f"Archivo migrado: {file_path} → {target_path}")
                    
                    # Eliminar carpeta antigua si está vacía
                    try:
                        old_folder.rmdir()
                        logger.info(f"Carpeta antigua eliminada: {old_folder}")
                    except OSError:
                        logger.warning(f"No se pudo eliminar carpeta antigua: {old_folder}")
            
            # Crear estructura completa actualizada
            cls.repair_folder_structure(dni_nie, role, first_name, last_name, department)
            
            logger.info(f"Migración completada para usuario {dni_nie}")
            return True
            
        except Exception as e:
            logger.error(f"Error migrando estructura para usuario {dni_nie}: {str(e)}")
            return False
    
    @classmethod
    def initialize_system_folders(cls) -> None:
        """
        Inicializa las carpetas base del sistema si no existen.
        """
        try:
            # Crear carpeta base de archivos de usuarios
            user_files_path = Path(settings.user_files_base_path)
            user_files_path.mkdir(parents=True, exist_ok=True)
            
            # Crear carpeta base de archivos de tráfico
            traffic_files_path = Path(settings.traffic_files_base_path)
            traffic_files_path.mkdir(parents=True, exist_ok=True)
            
            # Crear archivo README en la carpeta principal
            readme_path = user_files_path / "README.txt"
            if not readme_path.exists():
                with open(readme_path, "w", encoding="utf-8") as f:
                    f.write("SISTEMA DE ARCHIVOS DE USUARIOS - SGT PORTAL\n")
                    f.write("=" * 50 + "\n\n")
                    f.write("Esta carpeta contiene las carpetas personales de todos los usuarios del sistema.\n\n")
                    f.write("ESTRUCTURA:\n")
                    f.write("- Cada usuario tiene una carpeta con su DNI/NIE como nombre\n")
                    f.write("- Las subcarpetas se crean automáticamente según el rol del usuario\n")
                    f.write("- Las subcarpetas se crean automáticamente según el rol del usuario\n")
                    f.write("ACCESO:\n")
                    f.write("- Solo los administradores pueden acceder a todas las carpetas\n")
                    f.write("- Cada usuario puede acceder únicamente a su carpeta personal\n\n")
                    f.write(f"Carpeta creada: {datetime.now().strftime('%d/%m/%Y %H:%M')}\n")
            
            logger.info("Carpetas del sistema inicializadas correctamente")
            
        except Exception as e:
            logger.error(f"Error inicializando carpetas del sistema: {str(e)}")
            raise Exception(f"No se pudieron inicializar las carpetas del sistema: {str(e)}")
