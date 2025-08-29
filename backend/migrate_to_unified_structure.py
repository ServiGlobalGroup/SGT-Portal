#!/usr/bin/env python3
"""
Script de migración: Mueve archivos de estructura antigua a estructura unificada
"""

import os
import shutil
from pathlib import Path
from datetime import datetime

def migrate_user_files():
    """Migrar archivos de user_files a files/users"""
    old_path = Path("../user_files")
    new_path = Path("../files/users")
    
    if not old_path.exists():
        print("❌ No existe la carpeta user_files antigua")
        return
    
    print("📁 Migrando archivos de usuarios...")
    
    # Crear nueva estructura si no existe
    new_path.mkdir(parents=True, exist_ok=True)
    
    # Mover todas las carpetas de usuarios
    moved_count = 0
    for user_folder in old_path.iterdir():
        if user_folder.is_dir():
            dest_folder = new_path / user_folder.name
            if not dest_folder.exists():
                shutil.move(str(user_folder), str(dest_folder))
                print(f"✅ Movido: {user_folder.name} -> files/users/{user_folder.name}")
                moved_count += 1
            else:
                print(f"⚠️  Ya existe: files/users/{user_folder.name}")
    
    print(f"📊 Total carpetas migradas: {moved_count}")
    
    # Si la carpeta antigua está vacía, eliminarla
    if not any(old_path.iterdir()):
        old_path.rmdir()
        print("🗑️  Eliminada carpeta user_files vacía")

def migrate_traffic_files():
    """Migrar archivos de traffic_files a files/traffic"""
    old_path = Path("../traffic_files")
    new_path = Path("../files/traffic")
    
    if not old_path.exists():
        print("❌ No existe la carpeta traffic_files antigua")
        return
    
    print("🚛 Migrando archivos de tráfico...")
    
    # Crear nueva estructura si no existe
    new_path.mkdir(parents=True, exist_ok=True)
    
    # Mover todos los archivos/carpetas de tráfico
    moved_count = 0
    for item in old_path.iterdir():
        dest_item = new_path / item.name
        if not dest_item.exists():
            shutil.move(str(item), str(dest_item))
            print(f"✅ Movido: {item.name} -> files/traffic/{item.name}")
            moved_count += 1
        else:
            print(f"⚠️  Ya existe: files/traffic/{item.name}")
    
    print(f"📊 Total elementos migrados: {moved_count}")
    
    # Si la carpeta antigua está vacía, eliminarla
    if not any(old_path.iterdir()):
        old_path.rmdir()
        print("🗑️  Eliminada carpeta traffic_files vacía")

def create_migration_log():
    """Crear log de migración"""
    log_path = Path("../files/MIGRATION_LOG.txt")
    
    with open(log_path, "w", encoding="utf-8") as f:
        f.write("=" * 60 + "\n")
        f.write("LOG DE MIGRACIÓN A ESTRUCTURA UNIFICADA\n")
        f.write("=" * 60 + "\n\n")
        f.write(f"Fecha de migración: {datetime.now().strftime('%d/%m/%Y a las %H:%M')}\n\n")
        f.write("NUEVA ESTRUCTURA:\n")
        f.write("-" * 17 + "\n")
        f.write("files/\n")
        f.write("├── users/           # Carpetas personales de usuarios\n")
        f.write("├── traffic/         # Archivos del módulo de tráfico\n")
        f.write("├── documents/       # Documentos generales del sistema\n")
        f.write("├── payroll/         # Archivos de nóminas centralizadas\n")
        f.write("└── orders/          # Gestión de órdenes y pedidos\n\n")
        f.write("CAMBIOS REALIZADOS:\n")
        f.write("-" * 19 + "\n")
        f.write("• user_files/ -> files/users/\n")
        f.write("• traffic_files/ -> files/traffic/\n")
        f.write("• Configuración actualizada en .env y config.py\n")
        f.write("• Rutas actualizadas en servicios del backend\n\n")
    
    print(f"📝 Creado log de migración en: {log_path}")

if __name__ == "__main__":
    print("🔄 INICIANDO MIGRACIÓN A ESTRUCTURA UNIFICADA")
    print("=" * 50)
    
    # Cambiar al directorio del script
    os.chdir(Path(__file__).parent)
    
    # Ejecutar migraciones
    migrate_user_files()
    print()
    migrate_traffic_files()
    print()
    create_migration_log()
    
    print("\n✅ MIGRACIÓN COMPLETADA")
    print("=" * 25)
