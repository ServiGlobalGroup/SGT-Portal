from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import mimetypes
from pathlib import Path
from datetime import datetime
from app.database.connection import get_db
from sqlalchemy import text
from app.config import settings  # Usar configuración centralizada
from app.api.auth import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/users")
async def get_documentation_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Obtiene todos los usuarios con sus carpetas de documentos desde el sistema de archivos
    """
    try:
        # Usar la ruta unificada configurada en settings (files/users)
        user_files_path = Path(settings.user_files_base_path)
        
        if not user_files_path.exists():
            return []

        users_data = []
        
        # Consultar usuarios de la base de datos
        result = db.execute(text("""
            SELECT dni_nie, first_name, last_name, email, role, status 
            FROM users 
            ORDER BY last_name, first_name
        """))
        
        db_users = result.fetchall()
        
        # Crear un diccionario para mapear DNI a información del usuario
        user_info_map = {}
        for user in db_users:
            try:
                dni_nie = user[0]  # dni_nie es la primera columna
                user_info_map[dni_nie] = {
                    'first_name': user[1],
                    'last_name': user[2], 
                    'email': user[3],
                    'role': str(user[4]),  # Convertir enum a string
                    'status': str(user[5]),  # Usar status en lugar de is_active
                    'is_active': str(user[5]) == 'ACTIVO'  # Derivar is_active de status
                }
            except Exception as e:
                continue
        
        # Recorrer cada carpeta de usuario
        for user_folder in user_files_path.iterdir():
            if user_folder.is_dir():
                dni_nie = user_folder.name
                
                # Solo procesar usuarios que existen en la base de datos
                if dni_nie not in user_info_map:
                    continue  # Saltar usuarios sin datos en BD
                
                # Obtener información del usuario de la BD
                user_info = user_info_map[dni_nie]
                
                # Obtener documentos y estadísticas
                documents = []
                total_size = 0
                
                # Recorrer subcarpetas (documentos, nominas, vacaciones, etc.)
                for subfolder in user_folder.iterdir():
                    if subfolder.is_dir():
                        folder_name = subfolder.name
                        
                        # Recorrer archivos en cada subcarpeta
                        for file_path in subfolder.rglob("*"):
                            if file_path.is_file():
                                try:
                                    file_stat = file_path.stat()
                                    file_size = file_stat.st_size
                                    total_size += file_size
                                    
                                    documents.append({
                                        'id': str(hash(str(file_path))),
                                        'name': file_path.name,
                                        'type': file_path.suffix,
                                        'size': file_size,
                                        'folder': folder_name,
                                        'created_date': datetime.fromtimestamp(file_stat.st_ctime).strftime('%Y-%m-%d'),
                                        # Ruta relativa a la carpeta base de usuarios
                                        'path': str(file_path.relative_to(user_files_path.parent)),
                                        'user_dni': dni_nie
                                    })
                                except Exception as e:
                                    # Si hay error al acceder al archivo, continuar
                                    continue
                
                # Crear objeto usuario
                user_data = {
                    'id': dni_nie,
                    'dni': dni_nie,
                    'first_name': user_info['first_name'],
                    'last_name': user_info['last_name'],
                    'email': user_info['email'],
                    'role': user_info['role'],
                    'is_active': user_info['is_active'],
                    'status': user_info['status'],
                    'is_available_driver': (
                        user_info['is_active'] and 
                        user_info['role'] == 'TRABAJADOR'  # Usar TRABAJADOR que es el valor real en la BD
                    ),
                    'total_documents': len(documents),
                    'total_size': total_size,
                    'documents': documents
                }
                
                users_data.append(user_data)
        
        return users_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al cargar usuarios: {str(e)}")

@router.get("/user/{dni}/folders")
async def get_user_folders(dni: str, current_user: User = Depends(get_current_user)):
    """
    Obtiene las carpetas de un usuario específico
    """
    try:
        user_path = Path(settings.user_files_base_path) / dni
        
        if not user_path.exists():
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        folders = []
        for folder_path in user_path.iterdir():
            if folder_path.is_dir():
                file_count = len(list(folder_path.rglob("*")))
                folders.append({
                    'name': folder_path.name,
                    'file_count': file_count,
                    'path': str(folder_path.relative_to(Path("../")))
                })
        
        return folders
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener carpetas: {str(e)}")


@router.get("/download/{user_dni}/{folder}/{filename}")
async def download_document(user_dni: str, folder: str, filename: str, current_user: User = Depends(get_current_user)):
    """
    Descarga un documento específico de un usuario
    """
    try:
        # Construir la ruta al archivo
        user_files_path = Path(settings.user_files_base_path)
        file_path = user_files_path / user_dni / folder / filename
        
        # Verificar que el archivo existe
        if not file_path.exists() or not file_path.is_file():
            raise HTTPException(status_code=404, detail="Archivo no encontrado")
        
        # Verificar que no se está intentando acceder fuera del directorio permitido
        resolved_path = file_path.resolve()
        allowed_path = user_files_path.resolve()
        
        if not str(resolved_path).startswith(str(allowed_path)):
            raise HTTPException(status_code=403, detail="Acceso denegado")
        
        # Obtener el tipo MIME del archivo
        content_type, _ = mimetypes.guess_type(str(file_path))
        if content_type is None:
            content_type = 'application/octet-stream'
        
        # Retornar el archivo
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type=content_type
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al descargar archivo: {str(e)}")


@router.get("/preview/{user_dni}/{folder}/{filename}")
async def preview_document(user_dni: str, folder: str, filename: str, current_user: User = Depends(get_current_user)):
    """
    Previsualiza un documento (especialmente PDFs) en el navegador
    """
    try:
        # Construir la ruta al archivo
        user_files_path = Path(settings.user_files_base_path)
        file_path = user_files_path / user_dni / folder / filename
        
        # Verificar que el archivo existe
        if not file_path.exists() or not file_path.is_file():
            raise HTTPException(status_code=404, detail="Archivo no encontrado")
        
        # Verificar que no se está intentando acceder fuera del directorio permitido
        resolved_path = file_path.resolve()
        allowed_path = user_files_path.resolve()
        
        if not str(resolved_path).startswith(str(allowed_path)):
            raise HTTPException(status_code=403, detail="Acceso denegado")
        
        # Obtener el tipo MIME del archivo
        content_type, _ = mimetypes.guess_type(str(file_path))
        if content_type is None:
            content_type = 'application/octet-stream'
        
        # Para PDFs, establecer el content-type correcto para visualización en navegador
        if filename.lower().endswith('.pdf'):
            content_type = 'application/pdf'
        
        # Retornar el archivo para visualización en navegador (sin forzar descarga)
        return FileResponse(
            path=str(file_path),
            media_type=content_type,
            headers={
                "Content-Disposition": "inline"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al previsualizar archivo: {str(e)}")
