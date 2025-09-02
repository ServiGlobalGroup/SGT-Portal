#!/usr/bin/env python3
"""
Script para analizar todos los DNI/NIE únicos en un PDF y crear carpetas faltantes.
"""

import sys
import os
from pathlib import Path
from collections import defaultdict

# Agregar el directorio actual al path para importar módulos de la app
sys.path.insert(0, os.getcwd())

from app.services.payroll_pdf_service import PayrollPDFProcessor
from app.config import settings

def analyze_all_dni_nie_in_pdf(pdf_path: str):
    """
    Analiza todo el PDF y extrae todos los DNI/NIE únicos encontrados.
    
    Args:
        pdf_path: Ruta al archivo PDF
    """
    if not os.path.exists(pdf_path):
        print(f"❌ El archivo no existe: {pdf_path}")
        return
    
    print(f"🔍 Analizando todos los DNI/NIE en PDF: {pdf_path}")
    print("=" * 80)
    
    # Crear procesador
    processor = PayrollPDFProcessor(settings.user_files_base_path)
    
    try:
        import fitz
        
        # Abrir PDF
        pdf_document = fitz.open(pdf_path)
        total_pages = pdf_document.page_count
        
        print(f"📄 Total de páginas: {total_pages}")
        print()
        
        # Diccionario para contar occurrencias de cada DNI/NIE
        dni_nie_count = defaultdict(int)
        users_with_folders = []
        users_without_folders = []
        
        # Analizar todas las páginas
        for page_num in range(total_pages):
            if page_num % 10 == 0:
                print(f"⚡ Procesando página {page_num + 1}/{total_pages}...")
            
            try:
                # Obtener la página
                page = pdf_document[page_num]
                page_text = page.get_text()
                
                # Buscar DNI/NIE
                dni_nie = processor._extract_dni_nie(page_text)
                
                if dni_nie:
                    dni_nie_count[dni_nie] += 1
                    
                    # Verificar si existe la carpeta
                    user_folder = Path(settings.user_files_base_path) / dni_nie
                    if user_folder.exists():
                        if dni_nie not in users_with_folders:
                            users_with_folders.append(dni_nie)
                    else:
                        if dni_nie not in users_without_folders:
                            users_without_folders.append(dni_nie)
                
            except Exception as e:
                print(f"⚠️  Error en página {page_num + 1}: {str(e)}")
        
        pdf_document.close()
        
        # Mostrar resultados
        print()
        print("📊 ANÁLISIS COMPLETADO")
        print("=" * 50)
        print(f"👥 Total de usuarios únicos encontrados: {len(dni_nie_count)}")
        print(f"✅ Usuarios con carpeta: {len(users_with_folders)}")
        print(f"❌ Usuarios sin carpeta: {len(users_without_folders)}")
        print()
        
        if users_with_folders:
            print("✅ USUARIOS CON CARPETA:")
            for dni_nie in sorted(users_with_folders):
                pages = dni_nie_count[dni_nie]
                print(f"   - {dni_nie} ({pages} páginas)")
        
        if users_without_folders:
            print()
            print("❌ USUARIOS SIN CARPETA (NECESITAN CREARSE):")
            for dni_nie in sorted(users_without_folders):
                pages = dni_nie_count[dni_nie]
                print(f"   - {dni_nie} ({pages} páginas)")
        
        print()
        print("📋 DETALLE POR USUARIO:")
        for dni_nie in sorted(dni_nie_count.keys()):
            pages = dni_nie_count[dni_nie]
            user_folder = Path(settings.user_files_base_path) / dni_nie
            status = "✅" if user_folder.exists() else "❌"
            print(f"   {status} {dni_nie}: {pages} páginas")
        
        # Ofrecer crear carpetas faltantes
        if users_without_folders:
            print()
            print("🔧 ¿Desea crear las carpetas faltantes? (s/n): ", end="")
            response = input().lower().strip()
            
            if response == 's' or response == 'si' or response == 'sí':
                create_missing_folders(users_without_folders)
        
    except ImportError:
        print("❌ PyMuPDF (fitz) no está instalado. Ejecute: pip install PyMuPDF")
    except Exception as e:
        print(f"❌ Error procesando PDF: {str(e)}")

def create_missing_folders(dni_nie_list):
    """
    Crea carpetas faltantes para los usuarios especificados.
    
    Args:
        dni_nie_list: Lista de DNI/NIE para los que crear carpetas
    """
    print()
    print("🔧 Creando carpetas faltantes...")
    
    user_files_base = Path(settings.user_files_base_path)
    created_count = 0
    
    for dni_nie in dni_nie_list:
        try:
            # Crear carpeta principal del usuario
            user_folder = user_files_base / dni_nie
            user_folder.mkdir(parents=True, exist_ok=True)
            
            # Crear subcarpetas nominas y dietas
            for subfolder in ['nominas', 'dietas']:
                subfolder_path = user_folder / subfolder
                subfolder_path.mkdir(parents=True, exist_ok=True)
            
            print(f"✅ Creada carpeta: {dni_nie}")
            created_count += 1
            
        except Exception as e:
            print(f"❌ Error creando carpeta para {dni_nie}: {str(e)}")
    
    print(f"🎉 Se crearon {created_count} carpetas exitosamente.")

def main():
    print("🔧 ANÁLISIS COMPLETO DE DNI/NIE EN PDF")
    print("=" * 80)
    
    if len(sys.argv) < 2:
        print("❌ Uso: python analyze_pdf_users.py <ruta_del_pdf>")
        return
    
    pdf_path = sys.argv[1]
    analyze_all_dni_nie_in_pdf(pdf_path)

if __name__ == "__main__":
    main()
