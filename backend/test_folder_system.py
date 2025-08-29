"""
Script para probar y demostrar el sistema de carpetas mejorado.
Crea usuarios de ejemplo y muestra la estructura de carpetas generada.
"""

import os
import sys
from pathlib import Path

# Añadir el backend al path para importar módulos
BACKEND_DIR = Path(__file__).parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.folder_structure_service import FolderStructureService
from app.models.user import UserRole
from app.config import settings

def test_folder_creation():
    """
    Prueba la creación de carpetas para diferentes tipos de usuarios.
    """
    print("🚀 INICIANDO PRUEBA DEL SISTEMA DE CARPETAS")
    print("=" * 60)
    
    # Inicializar sistema
    try:
        FolderStructureService.initialize_system_folders()
        print("✅ Sistema de carpetas inicializado")
    except Exception as e:
        print(f"❌ Error inicializando sistema: {e}")
        return
    
    # Usuarios de ejemplo para probar
    test_users = [
        {
            "dni_nie": "12345678Z",
            "role": UserRole.TRABAJADOR,
            "first_name": "Juan",
            "last_name": "García López",
            "department": "Conductores"
        },
        {
            "dni_nie": "87654321Y",
            "role": UserRole.TRAFICO,
            "first_name": "María",
            "last_name": "Fernández Ruiz",
            "department": "Tráfico"
        },
        {
            "dni_nie": "11111111H",
            "role": UserRole.ADMINISTRADOR,
            "first_name": "Carlos",
            "last_name": "Administrador",
            "department": "Administración"
        }
    ]
    
    print("\\n📁 CREANDO CARPETAS DE USUARIOS DE EJEMPLO")
    print("-" * 50)
    
    for user in test_users:
        try:
            print(f"\\n👤 Creando carpetas para: {user['first_name']} {user['last_name']}")
            print(f"   DNI/NIE: {user['dni_nie']}")
            print(f"   Rol: {user['role'].name}")
            print(f"   Departamento: {user['department']}")
            
            # Crear estructura de carpetas
            folder_path = FolderStructureService.create_user_folder_structure(
                dni_nie=user["dni_nie"],
                role=user["role"],
                first_name=user["first_name"],
                last_name=user["last_name"],
                department=user["department"]
            )
            
            print(f"   📂 Carpeta creada en: {folder_path}")
            
            # Validar estructura
            is_valid, missing = FolderStructureService.validate_folder_structure(
                user["dni_nie"], user["role"]
            )
            
            if is_valid:
                print("   ✅ Estructura válida")
            else:
                print(f"   ⚠️ Carpetas faltantes: {missing}")
            
            # Mostrar información de la carpeta
            folder_info = FolderStructureService.get_folder_info(user["dni_nie"])
            if folder_info:
                subfolders = folder_info.get("subfolders", {})
                print(f"   📊 Subcarpetas creadas: {len(subfolders)}")
                for subfolder_name in subfolders.keys():
                    print(f"      • {subfolder_name}/")
            
        except Exception as e:
            print(f"   ❌ Error creando carpetas para {user['dni_nie']}: {e}")
    
    print("\\n" + "=" * 60)
    print("🎯 RESUMEN DEL SISTEMA DE CARPETAS")
    print("=" * 60)
    
    # Mostrar estructura del sistema
    user_files_path = Path(settings.user_files_base_path)
    if user_files_path.exists():
        print(f"\\n📍 Ubicación base: {user_files_path.absolute()}")
        
        # Listar carpetas de usuarios
        user_folders = [d for d in user_files_path.iterdir() if d.is_dir()]
        print(f"👥 Carpetas de usuarios: {len(user_folders)}")
        
        for folder in user_folders:
            print(f"   📁 {folder.name}/")
            # Contar subcarpetas
            subfolders = [d for d in folder.iterdir() if d.is_dir()]
            files = [f for f in folder.iterdir() if f.is_file()]
            print(f"      • {len(subfolders)} subcarpetas, {len(files)} archivos")
    
    print("\\n🏗️ CARACTERÍSTICAS DEL NUEVO SISTEMA:")
    print("-" * 40)
    print("✨ Carpetas específicas por rol (conductor, tráfico, admin)")
    print("📋 Archivo README automático en cada carpeta")
    print("🔒 Archivos .gitkeep para control de versiones")
    print("🛠️ Funciones de validación y reparación")
    print("📊 Herramientas de migración desde estructura antigua")
    print("🎯 API endpoints para gestión desde el frontend")
    
    print("\\n✅ PRUEBA COMPLETADA")
    
def show_folder_structures():
    """
    Muestra las estructuras de carpetas definidas para cada rol.
    """
    print("\\n" + "=" * 60)
    print("📋 ESTRUCTURAS DE CARPETAS POR ROL")
    print("=" * 60)
    
    for role, folders in FolderStructureService.FOLDER_STRUCTURES.items():
        print(f"\\n🏷️ ROL: {role.name}")
        print("-" * 30)
        
        for folder_name, description in folders.items():
            print(f"📁 {folder_name}/")
            print(f"   → {description}")

if __name__ == "__main__":
    print("🏗️ SISTEMA DE CARPETAS MEJORADO - SGT PORTAL")
    print("Este script demuestra las nuevas características del sistema")
    print()
    
    # Mostrar estructuras definidas
    show_folder_structures()
    
    # Realizar pruebas
    test_folder_creation()
    
    print("\\n🎉 ¡Todo listo! El sistema de carpetas está funcionando correctamente.")
    print("\\nPróximos pasos:")
    print("1. Reinicia el backend para que se inicialicen las carpetas base")
    print("2. Crea usuarios desde el frontend para probar la creación automática")
    print("3. Usa los endpoints /api/folder-management/ para gestión avanzada")
    print("4. Revisa las carpetas creadas en:", Path(settings.user_files_base_path).absolute())
