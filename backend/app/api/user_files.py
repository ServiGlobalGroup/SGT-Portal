from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Query
from fastapi.responses import FileResponse
from app.api.auth import get_current_active_user
from app.models.user import User, UploadHistory
from app.models.schemas import UploadHistoryItem, UploadHistoryResponse
from app.database.connection import get_db
from app.config import settings
from sqlalchemy.orm import Session
from typing import List, Optional
import os
from pathlib import Path
from datetime import datetime

router = APIRouter()

@router.get("/user-documents/{folder_type}")
async def get_user_documents(
    folder_type: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Obtiene los documentos de nóminas o dietas del usuario.
    
    Args:
        folder_type: Tipo de carpeta (nominas, dietas)
    """
    
    # Validar que el tipo de carpeta es válido - solo nóminas y dietas
    valid_folders = ["nominas", "dietas"]
    if folder_type not in valid_folders:
        raise HTTPException(status_code=400, detail="Solo se permiten carpetas de nóminas y dietas")
    
    # Construir la ruta de la carpeta del usuario
    user_folder = Path(settings.user_files_base_path) / current_user.dni_nie / folder_type
    
    if not user_folder.exists():
        return {
            "documents": [],
            "folder_type": folder_type,
            "total_files": 0,
            "total_size": 0
        }
    
    documents = []
    total_size = 0
    
    try:
        for file_path in user_folder.iterdir():
            if file_path.is_file():
                file_stat = file_path.stat()
                file_size = file_stat.st_size
                total_size += file_size
                
                documents.append({
                    "id": len(documents) + 1,
                    "name": file_path.name,
                    "size": file_size,
                    "type": file_path.suffix.lower(),
                    "created_date": datetime.fromtimestamp(file_stat.st_ctime).isoformat(),
                    "modified_date": datetime.fromtimestamp(file_stat.st_mtime).isoformat(),
                    "download_url": f"/api/user-files/download/{current_user.dni_nie}/{folder_type}/{file_path.name}"
                })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al leer la carpeta: {str(e)}")
    
    return {
        "documents": documents,
        "folder_type": folder_type,
        "total_files": len(documents),
        "total_size": total_size
    }

@router.get("/download/{dni_nie}/{folder_type}/{filename}")
async def download_file(
    dni_nie: str,
    folder_type: str,
    filename: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Descarga un archivo específico del usuario.
    Solo permite descargar archivos del propio usuario o si es admin.
    """
    
    # Verificar permisos
    user_role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if user_role != "ADMINISTRADOR" and current_user.dni_nie != dni_nie:
        raise HTTPException(status_code=403, detail="No tienes permisos para acceder a estos archivos")
    
    # Validar tipo de carpeta - solo nóminas y dietas
    valid_folders = ["nominas", "dietas"]
    if folder_type not in valid_folders:
        raise HTTPException(status_code=400, detail="Solo se permiten carpetas de nóminas y dietas")
    
    # Construir la ruta del archivo
    file_path = Path(settings.user_files_base_path) / dni_nie / folder_type / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    
    if not file_path.is_file():
        raise HTTPException(status_code=400, detail="La ruta no corresponde a un archivo")
    
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type='application/octet-stream',
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.post("/upload/{folder_type}")
async def upload_file(
    folder_type: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """
    Sube un archivo a la carpeta de nóminas o dietas del usuario.
    """
    
    # Validar tipo de carpeta - solo nóminas y dietas
    valid_folders = ["nominas", "dietas"]
    if folder_type not in valid_folders:
        raise HTTPException(status_code=400, detail="Solo se permiten carpetas de nóminas y dietas")
    
    # Validar archivo
    if not file.filename:
        raise HTTPException(status_code=400, detail="No se proporcionó un archivo")
    
    # Construir la ruta de destino
    user_folder = Path(settings.user_files_base_path) / current_user.dni_nie / folder_type
    user_folder.mkdir(parents=True, exist_ok=True)
    
    file_path = user_folder / file.filename
    
    # Verificar si el archivo ya existe
    if file_path.exists():
        # Generar un nombre único
        name_parts = file.filename.rsplit('.', 1)
        if len(name_parts) == 2:
            name, ext = name_parts
            counter = 1
            while file_path.exists():
                new_filename = f"{name}_{counter}.{ext}"
                file_path = user_folder / new_filename
                counter += 1
        else:
            counter = 1
            while file_path.exists():
                new_filename = f"{file.filename}_{counter}"
                file_path = user_folder / new_filename
                counter += 1
    
    try:
        # Guardar el archivo
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        file_stat = file_path.stat()
        
        return {
            "message": "Archivo subido exitosamente",
            "filename": file_path.name,
            "size": file_stat.st_size,
            "folder_type": folder_type,
            "upload_date": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar el archivo: {str(e)}")

@router.delete("/delete/{folder_type}/{filename}")
async def delete_file(
    folder_type: str,
    filename: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Elimina un archivo de nóminas o dietas del usuario.
    """
    
    # Validar tipo de carpeta - solo nóminas y dietas
    valid_folders = ["nominas", "dietas"]
    if folder_type not in valid_folders:
        raise HTTPException(status_code=400, detail="Solo se permiten carpetas de nóminas y dietas")
    
    # Construir la ruta del archivo
    file_path = Path(settings.user_files_base_path) / current_user.dni_nie / folder_type / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    
    try:
        file_path.unlink()
        return {"message": "Archivo eliminado exitosamente", "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al eliminar el archivo: {str(e)}")

@router.get("/folder-stats")
async def get_folder_stats(current_user: User = Depends(get_current_active_user)):
    """
    Obtiene estadísticas de las carpetas de nóminas y dietas del usuario.
    """
    
    user_base_folder = Path(settings.user_files_base_path) / current_user.dni_nie
    
    if not user_base_folder.exists():
        return {
            "folders": {},
            "total_files": 0,
            "total_size": 0
        }
    
    folder_stats = {}
    total_files = 0
    total_size = 0
    
    valid_folders = ["nominas", "dietas"]
    
    for folder_name in valid_folders:
        folder_path = user_base_folder / folder_name
        
        if folder_path.exists() and folder_path.is_dir():
            files = list(folder_path.iterdir())
            file_count = len([f for f in files if f.is_file()])
            folder_size = sum(f.stat().st_size for f in files if f.is_file())
            
            folder_stats[folder_name] = {
                "file_count": file_count,
                "size": folder_size
            }
            
            total_files += file_count
            total_size += folder_size
        else:
            folder_stats[folder_name] = {
                "file_count": 0,
                "size": 0
            }
    
    return {
        "folders": folder_stats,
        "total_files": total_files,
        "total_size": total_size
    }

@router.get("/preview/{dni_nie}/{folder_type}/{filename}")
async def preview_file(
    dni_nie: str,
    folder_type: str,
    filename: str,
    token: Optional[str] = None
):
    """
    Vista previa de archivos PDF con autenticación por token en query parameter.
    Específicamente diseñado para funcionar con iframes.
    """
    from app.api.auth import get_current_user
    from app.database.connection import get_db
    from jose import JWTError, jwt
    from app.config import settings
    
    # Validar token JWT del query parameter
    if not token:
        raise HTTPException(status_code=401, detail="Token requerido")
    
    try:
        # Crear una sesión de base de datos
        db_gen = get_db()
        db = next(db_gen)
        
        # Verificar el token manualmente
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        dni_nie_from_token = payload.get("sub")
        if dni_nie_from_token is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        
        # Verificar que el DNI del token coincida con el solicitado
        if dni_nie_from_token != dni_nie:
            raise HTTPException(status_code=403, detail="No tienes permisos para acceder a estos archivos")
        
        # Validar tipo de carpeta - solo nóminas y dietas
        valid_folders = ["nominas", "dietas"]
        if folder_type not in valid_folders:
            raise HTTPException(status_code=400, detail="Solo se permiten carpetas de nóminas y dietas")
        
        # Construir la ruta del archivo
        file_path = Path(settings.user_files_base_path) / dni_nie / folder_type / filename
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Archivo no encontrado")
        
        if not file_path.is_file():
            raise HTTPException(status_code=400, detail="La ruta no corresponde a un archivo")
        
        # Retornar el archivo con Content-Type específico para PDF
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type='application/pdf',
            headers={"Content-Disposition": "inline"}
        )
        
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar la solicitud: {str(e)}")
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass

# ============================================================================
# ENDPOINTS PARA HISTORIAL DE SUBIDAS
# ============================================================================

@router.post("/upload-history")
async def create_upload_history(
    history_item: UploadHistoryItem,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Crea un nuevo registro en el historial de subidas.
    """
    db_history = UploadHistory(
        file_name=history_item.file_name,
        upload_date=history_item.upload_date,
        user_dni=current_user.dni_nie,
        user_name=f"{current_user.first_name} {current_user.last_name}",
        document_type=history_item.document_type,
        month=history_item.month,
        year=history_item.year,
        total_pages=history_item.total_pages,
        successful_pages=history_item.successful_pages,
        failed_pages=history_item.failed_pages,
        status=history_item.status
    )
    
    db.add(db_history)
    db.commit()
    db.refresh(db_history)
    
    return {
        "id": db_history.id,
        "message": "Historial registrado correctamente"
    }

@router.get("/upload-history", response_model=UploadHistoryResponse)
async def get_upload_history(
    skip: int = Query(0, ge=0, description="Número de registros a saltar"),
    limit: int = Query(100, ge=1, le=1000, description="Número máximo de registros a devolver"),
    document_type: Optional[str] = Query(None, description="Filtrar por tipo de documento"),
    status: Optional[str] = Query(None, description="Filtrar por estado"),
    year: Optional[str] = Query(None, description="Filtrar por año"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene el historial de subidas del usuario actual (o todos si es admin).
    """
    query = db.query(UploadHistory)
    
    # Si no es admin, solo mostrar sus propios registros
    if current_user.role.value != "ADMINISTRADOR":
        query = query.filter(UploadHistory.user_dni == current_user.dni_nie)
    
    # Aplicar filtros opcionales
    if document_type:
        query = query.filter(UploadHistory.document_type == document_type)
    if status:
        query = query.filter(UploadHistory.status == status)
    if year:
        query = query.filter(UploadHistory.year == year)
    
    # Ordenar por fecha de subida descendente
    query = query.order_by(UploadHistory.upload_date.desc())
    
    # Obtener total antes de aplicar paginación
    total = query.count()
    
    # Aplicar paginación
    items = query.offset(skip).limit(limit).all()
    
    # Convertir a UploadHistoryItem
    history_items = []
    for item in items:
        history_items.append(UploadHistoryItem(
            id=item.id,
            file_name=item.file_name,
            upload_date=item.upload_date,
            user_dni=item.user_dni,
            user_name=item.user_name,
            document_type=item.document_type,
            month=item.month,
            year=item.year,
            total_pages=item.total_pages,
            successful_pages=item.successful_pages,
            failed_pages=item.failed_pages,
            status=item.status,
            created_at=item.created_at,
            updated_at=item.updated_at
        ))
    
    return UploadHistoryResponse(
        items=history_items,
        total=total
    )

@router.put("/upload-history/{history_id}")
async def update_upload_history(
    history_id: int,
    status: str,
    successful_pages: Optional[int] = None,
    failed_pages: Optional[int] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Actualiza el estado de un registro del historial.
    """
    # Buscar el registro
    db_history = db.query(UploadHistory).filter(UploadHistory.id == history_id).first()
    
    if not db_history:
        raise HTTPException(status_code=404, detail="Registro de historial no encontrado")
    
    # Verificar permisos (solo el propietario o admin)
    if current_user.role.value != "ADMINISTRADOR" and db_history.user_dni != current_user.dni_nie:
        raise HTTPException(status_code=403, detail="Sin permisos para modificar este registro")
    
    # Actualizar campos
    db_history.status = status
    if successful_pages is not None:
        db_history.successful_pages = successful_pages
    if failed_pages is not None:
        db_history.failed_pages = failed_pages
    
    db.commit()
    db.refresh(db_history)
    
    return {
        "id": db_history.id,
        "message": "Historial actualizado correctamente"
    }

# Nuevos endpoints para administradores
@router.get("/admin/all-users-documents")
async def get_all_users_documents(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene todos los usuarios y sus documentos de nóminas y dietas.
    Solo para administradores.
    """
    try:
        # Log para depuración
        print(f"Current user: {current_user.email}, Role: {current_user.role}")
        
        # Verificar permisos de administrador de manera más robusta
        is_admin = False
        if hasattr(current_user.role, 'value'):
            is_admin = current_user.role.value == "ADMINISTRADOR"
        else:
            is_admin = str(current_user.role) == "ADMINISTRADOR"
        
        print(f"Is admin: {is_admin}")
        
        if not is_admin:
            raise HTTPException(status_code=403, detail="No tienes permisos para acceder a esta información")
        
        # Escanear carpetas físicas de usuarios en lugar de solo la base de datos
        user_files_path = Path(settings.user_files_base_path)
        users_with_documents = []
        total_documents = 0
        total_size = 0
        
        if not user_files_path.exists():
            return {
                "users": [],
                "statistics": {
                    "total_users": 0,
                    "active_users": 0,
                    "total_documents": 0,
                    "users_with_documents": 0,
                    "total_size": 0
                }
            }
        
        # Obtener todas las carpetas de usuarios que existen físicamente
        user_folders = [folder for folder in user_files_path.iterdir() 
                       if folder.is_dir() and folder.name != "traffic"]
        print(f"Found {len(user_folders)} user folders: {[f.name for f in user_folders]}")
        
        for user_folder in user_folders:
            dni_nie = user_folder.name
            
            # Buscar información del usuario en la base de datos
            user = db.query(User).filter(User.dni_nie == dni_nie).first()
            
            # Crear datos del usuario (con datos de BD si existe, o datos básicos si no)
            if user:
                user_data = {
                    "id": user.id,
                    "name": user.full_name,
                    "email": user.email,
                    "dni_nie": user.dni_nie,
                    "role": user.role.value if hasattr(user.role, 'value') else str(user.role),
                    "department": getattr(user, 'department', 'General'),
                    "is_active": user.is_active,
                    "documents": {
                        "nominas": [],
                        "dietas": []
                    },
                    "total_documents": 0,
                    "total_size": 0
                }
            else:
                # Usuario no encontrado en BD, usar datos básicos
                user_data = {
                    "id": f"file_{dni_nie}",
                    "name": f"Usuario {dni_nie}",
                    "email": "No disponible",
                    "dni_nie": dni_nie,
                    "role": "UNKNOWN",
                    "department": "No asignado",
                    "is_active": False,
                    "documents": {
                        "nominas": [],
                        "dietas": []
                    },
                    "total_documents": 0,
                    "total_size": 0
                }
            
            # Verificar carpetas de documentos del usuario
            user_base_path = user_folder
            
            for folder_type in ["nominas", "dietas"]:
                folder_path = user_base_path / folder_type
                
                if folder_path.exists() and folder_path.is_dir():
                    documents = []
                    
                    try:
                        for file_path in folder_path.iterdir():
                            if file_path.is_file():
                                file_stat = file_path.stat()
                                file_size = file_stat.st_size
                                
                                document = {
                                    "id": f"{dni_nie}_{folder_type}_{len(documents) + 1}",
                                    "name": file_path.name,
                                    "size": file_size,
                                    "type": file_path.suffix.lower(),
                                    "created_date": datetime.fromtimestamp(file_stat.st_ctime).isoformat(),
                                    "modified_date": datetime.fromtimestamp(file_stat.st_mtime).isoformat(),
                                    "download_url": f"/api/user-files/download/{dni_nie}/{folder_type}/{file_path.name}"
                                }
                                
                                documents.append(document)
                                user_data["total_size"] += file_size
                                total_size += file_size
                                
                    except Exception as e:
                        # Si hay error leyendo la carpeta, continuar con el siguiente usuario
                        continue
                    
                    user_data["documents"][folder_type] = documents
                    user_data["total_documents"] += len(documents)
                    total_documents += len(documents)
            
            users_with_documents.append(user_data)
            print(f"Added user: ID={user_data['id']}, DNI={user_data['dni_nie']}, Name={user_data['name']}")
    
        print(f"Final users_with_documents: {len(users_with_documents)} users")
        for i, user in enumerate(users_with_documents):
            print(f"User {i}: ID={user['id']}, DNI={user['dni_nie']}, Name={user['name']}")
    
        return {
            "users": users_with_documents,
            "statistics": {
                "total_users": len(users_with_documents),
                "active_users": len([u for u in users_with_documents if u["is_active"]]),
                "total_documents": total_documents,
                "users_with_documents": len([u for u in users_with_documents if u["total_documents"] > 0]),
                "total_size": total_size
            }
        }
    
    except Exception as e:
        print(f"Error in get_all_users_documents: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")

@router.get("/admin/user/{dni_nie}/documents")
async def get_user_documents_admin(
    dni_nie: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene los documentos de un usuario específico.
    Solo para administradores.
    """
    # Verificar permisos de administrador
    user_role = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if user_role != "ADMIN":
        raise HTTPException(status_code=403, detail="No tienes permisos para acceder a esta información")
    
    # Verificar que el usuario existe
    user = db.query(User).filter(User.dni_nie == dni_nie).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    user_base_path = Path(settings.user_files_base_path) / dni_nie
    user_documents = {
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "dni_nie": user.dni_nie,
            "role": user.role.value,
            "is_active": user.is_active
        },
        "documents": {
            "nominas": [],
            "dietas": []
        },
        "total_documents": 0,
        "total_size": 0
    }
    
    for folder_type in ["nominas", "dietas"]:
        folder_path = user_base_path / folder_type
        
        if folder_path.exists() and folder_path.is_dir():
            documents = []
            
            try:
                for file_path in folder_path.iterdir():
                    if file_path.is_file():
                        file_stat = file_path.stat()
                        file_size = file_stat.st_size
                        
                        document = {
                            "id": f"{dni_nie}_{folder_type}_{len(documents) + 1}",
                            "name": file_path.name,
                            "size": file_size,
                            "type": file_path.suffix.lower(),
                            "created_date": datetime.fromtimestamp(file_stat.st_ctime).isoformat(),
                            "modified_date": datetime.fromtimestamp(file_stat.st_mtime).isoformat(),
                            "download_url": f"/api/user-files/download/{dni_nie}/{folder_type}/{file_path.name}"
                        }
                        
                        documents.append(document)
                        user_documents["total_size"] += file_size
            except Exception as e:
                # Si hay error leyendo la carpeta, devolver lista vacía
                pass
            
            user_documents["documents"][folder_type] = documents
            user_documents["total_documents"] += len(documents)
    
    return user_documents
