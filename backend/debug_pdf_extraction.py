#!/usr/bin/env python3
"""
Script de debug para verificar la extracción de DNI/NIE de PDFs de nóminas.
Ayuda a diagnosticar problemas en el procesamiento masivo de PDFs.
"""

import sys
import os
from pathlib import Path

# Agregar el directorio actual al path para importar módulos de la app
sys.path.insert(0, os.getcwd())

from app.services.payroll_pdf_service import PayrollPDFProcessor
from app.config import settings

def debug_pdf_file(pdf_path: str, max_pages: int = 5):
    """
    Analiza un archivo PDF y muestra información de debug para las primeras páginas.
    
    Args:
        pdf_path: Ruta al archivo PDF
        max_pages: Número máximo de páginas a analizar
    """
    if not os.path.exists(pdf_path):
        print(f"❌ El archivo no existe: {pdf_path}")
        return
    
    print(f"🔍 Analizando PDF: {pdf_path}")
    print("=" * 80)
    
    # Crear procesador
    processor = PayrollPDFProcessor(settings.user_files_base_path)
    
    try:
        # Verificar dependencias
        import fitz
        
        # Abrir PDF
        pdf_document = fitz.open(pdf_path)
        total_pages = pdf_document.page_count
        
        print(f"📄 Total de páginas: {total_pages}")
        print()
        
        # Analizar las primeras páginas
        pages_to_analyze = min(max_pages, total_pages)
        
        for page_num in range(pages_to_analyze):
            print(f"📄 PÁGINA {page_num + 1}")
            print("-" * 40)
            
            # Usar método de debug del procesador
            debug_info = processor.debug_text_extraction(pdf_path, page_num)
            
            if debug_info.get("error"):
                print(f"❌ Error: {debug_info['error']}")
                continue
            
            print(f"✅ Texto encontrado: {debug_info['text_found']}")
            print(f"🔍 DNI/NIE final: {debug_info['final_dni_nie'] or 'NO ENCONTRADO'}")
            
            if debug_info['dni_nie_attempts']:
                print("🔎 Intentos de extracción:")
                for attempt in debug_info['dni_nie_attempts']:
                    print(f"   - {attempt['method']}: {attempt['result'] or 'Sin resultado'}")
            
            # Mostrar algunas líneas del texto
            if debug_info['text_content']:
                lines = debug_info['text_content'].split('\n')
                print("📝 Primeras líneas del texto:")
                for i, line in enumerate(lines[:10]):
                    if line.strip():
                        print(f"   {i+1:2d}: {line.strip()}")
            
            # Verificar si existe carpeta del usuario
            if debug_info['final_dni_nie']:
                user_folder = Path(settings.user_files_base_path) / debug_info['final_dni_nie']
                exists = user_folder.exists()
                print(f"📁 Carpeta del usuario existe: {exists}")
                if exists:
                    print(f"   Ruta: {user_folder}")
            
            print()
        
        pdf_document.close()
        
    except ImportError:
        print("❌ PyMuPDF (fitz) no está instalado. Ejecute: pip install PyMuPDF")
    except Exception as e:
        print(f"❌ Error procesando PDF: {str(e)}")

def list_available_pdfs():
    """Lista archivos PDF disponibles en diferentes directorios."""
    print("📁 Buscando archivos PDF disponibles...")
    
    # Directorios donde buscar PDFs
    search_dirs = [
        ".",
        "../files/payroll",
        "../files/traffic", 
        "../files/documents"
    ]
    
    pdf_files = []
    
    for search_dir in search_dirs:
        dir_path = Path(search_dir)
        if dir_path.exists():
            for pdf_file in dir_path.glob("*.pdf"):
                pdf_files.append(pdf_file.absolute())
    
    if pdf_files:
        print(f"📄 Encontrados {len(pdf_files)} archivos PDF:")
        for i, pdf_file in enumerate(pdf_files, 1):
            print(f"   {i}. {pdf_file}")
    else:
        print("❌ No se encontraron archivos PDF")
    
    return pdf_files

def main():
    print("🔧 HERRAMIENTA DE DEBUG - EXTRACCIÓN DE DNI/NIE DE PDFs")
    print("=" * 80)
    
    if len(sys.argv) > 1:
        # Si se proporciona un archivo como argumento
        pdf_path = sys.argv[1]
        max_pages = int(sys.argv[2]) if len(sys.argv) > 2 else 5
        debug_pdf_file(pdf_path, max_pages)
    else:
        # Listar PDFs disponibles
        pdf_files = list_available_pdfs()
        
        if pdf_files:
            print("\n🔍 Para analizar un PDF específico:")
            print("python debug_pdf_extraction.py <ruta_del_pdf> [max_paginas]")
            print("\nEjemplo:")
            print(f"python debug_pdf_extraction.py \"{pdf_files[0]}\" 3")
        
        print(f"\n📂 Ruta base de usuarios configurada: {settings.user_files_base_path}")
        print(f"📁 Carpetas de usuarios existentes:")
        
        users_dir = Path(settings.user_files_base_path)
        if users_dir.exists():
            user_folders = [f.name for f in users_dir.iterdir() if f.is_dir() and not f.name.startswith('.')]
            if user_folders:
                for folder in sorted(user_folders):
                    print(f"   - {folder}")
            else:
                print("   (Sin carpetas de usuarios)")

if __name__ == "__main__":
    main()
