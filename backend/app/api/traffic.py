"""
API real para gestión de carpetas y archivos de Tráfico.
Elimina la simulación previa y opera directamente sobre el filesystem
usando settings.traffic_files_base_path.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, field_validator
from typing import List, Optional
from datetime import datetime
from pathlib import Path
import os
import shutil
import unicodedata

from app.config import settings

router = APIRouter()

BASE_PATH = Path(settings.traffic_files_base_path).resolve()
BASE_PATH.mkdir(parents=True, exist_ok=True)

ILLEGAL_CHARS = set('<>:\\"|?*')


def _secure_name(name: str) -> str:
    # Normalizar y eliminar caracteres no permitidos
    name = unicodedata.normalize('NFKC', name).strip()
    if any(c in ILLEGAL_CHARS for c in name):
        raise HTTPException(status_code=400, detail="Nombre contiene caracteres no permitidos")
    # Evitar path traversal
    if '/' in name or '\\' in name:
        raise HTTPException(status_code=400, detail="Nombre de carpeta inválido")
    if not name:
        raise HTTPException(status_code=400, detail="Nombre vacío")
    return name


def _resolve_relative(rel: str | None) -> Path:
    rel = (rel or '').strip().replace('\\', '/').lstrip('/')
    full = (BASE_PATH / rel).resolve()
    if BASE_PATH not in full.parents and full != BASE_PATH:
        raise HTTPException(status_code=400, detail="Ruta fuera del directorio permitido")
    return full


class TrafficFolderCreate(BaseModel):
    name: str
    parent_path: Optional[str] = None

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        return _secure_name(v)


class TrafficFolderInfo(BaseModel):
    name: str
    relative_path: str
    created_at: datetime
    updated_at: datetime
    type: str = "folder"


class TrafficFileInfo(BaseModel):
    name: str
    relative_path: str
    size: int
    mime_type: Optional[str]
    created_at: datetime
    updated_at: datetime


@router.get('/folders', response_model=List[TrafficFolderInfo])
def list_folders(parent_path: Optional[str] = Query(None, description="Ruta relativa desde la raíz de tráfico")):
    target = _resolve_relative(parent_path)
    # Si no existe la creamos silenciosamente para evitar 404 iniciales
    if not target.exists():
        target.mkdir(parents=True, exist_ok=True)
    if not target.is_dir():
        raise HTTPException(status_code=400, detail="La ruta no es un directorio")

    items: List[TrafficFolderInfo] = []
    for entry in sorted(target.iterdir()):
        if entry.is_dir():
            stat = entry.stat()
            relative_path = str(entry.relative_to(BASE_PATH)).replace('\\', '/')
            items.append(TrafficFolderInfo(
                name=entry.name,
                relative_path=relative_path,
                created_at=datetime.fromtimestamp(stat.st_ctime),
                updated_at=datetime.fromtimestamp(stat.st_mtime),
                type="folder"
            ))
    
    return items


@router.post('/folders', response_model=TrafficFolderInfo, status_code=201)
def create_folder(payload: TrafficFolderCreate):
    parent_dir = _resolve_relative(payload.parent_path)
    if not parent_dir.exists():
        raise HTTPException(status_code=404, detail="Carpeta padre no existe")
    if not parent_dir.is_dir():
        raise HTTPException(status_code=400, detail="Ruta padre no es un directorio")

    new_dir = parent_dir / payload.name
    if new_dir.exists():
        raise HTTPException(status_code=409, detail="La carpeta ya existe")

    new_dir.mkdir(parents=False, exist_ok=False)
    stat = new_dir.stat()
    return TrafficFolderInfo(
        name=new_dir.name,
    relative_path=new_dir.relative_to(BASE_PATH).as_posix(),
        created_at=datetime.fromtimestamp(stat.st_ctime),
        updated_at=datetime.fromtimestamp(stat.st_mtime),
        type="folder"
    )


@router.delete('/folders')
def delete_folder(path: str = Query(..., description="Ruta relativa de la carpeta a eliminar"), recursive: bool = Query(False)):
    target = _resolve_relative(path)
    if not target.exists() or not target.is_dir():
        raise HTTPException(status_code=404, detail="Carpeta no encontrada")
    if any(target.iterdir()) and not recursive:
        raise HTTPException(status_code=409, detail="Carpeta no vacía. Usa recursive=true para forzar.")
    if recursive:
        shutil.rmtree(target)
    else:
        target.rmdir()
    return {"message": "Carpeta eliminada"}


class UploadResponse(BaseModel):
    files: List[TrafficFileInfo]


@router.get('/files', response_model=List[TrafficFileInfo])
def list_files(path: Optional[str] = Query(None, description="Ruta relativa de la carpeta")):
    target = _resolve_relative(path)
    if not target.exists():
        # Crear automáticamente la carpeta solicitada para no devolver 404
        target.mkdir(parents=True, exist_ok=True)
    if not target.is_dir():
        raise HTTPException(status_code=400, detail="La ruta no es un directorio")
    files: List[TrafficFileInfo] = []
    for entry in sorted(target.iterdir()):
        if entry.is_file():
            # Ignorar archivos de sistema de Windows que no aportan valor en la UI
            if entry.name.lower() in {"thumbs.db", "desktop.ini"}:
                continue
            stat = entry.stat()
            files.append(TrafficFileInfo(
                name=entry.name,
                relative_path=entry.relative_to(BASE_PATH).as_posix(),
                size=stat.st_size,
                mime_type=None,  # Se podría inferir con mimetypes
                created_at=datetime.fromtimestamp(stat.st_ctime),
                updated_at=datetime.fromtimestamp(stat.st_mtime)
            ))
    return files


@router.post('/upload', response_model=UploadResponse, status_code=201)
def upload_files(target_path: Optional[str] = Form(None), files: List[UploadFile] = File(...)):
    directory = _resolve_relative(target_path)
    if not directory.exists():
        raise HTTPException(status_code=404, detail="Carpeta destino no existe")
    if not directory.is_dir():
        raise HTTPException(status_code=400, detail="Ruta destino no es un directorio")

    saved: List[TrafficFileInfo] = []
    for f in files:
        if not f.filename:
            continue
        safe_name = _secure_name(f.filename)
        destination = directory / safe_name
        # Evitar sobrescritura
        counter = 1
        base_name = destination.stem
        suffix = destination.suffix
        while destination.exists():
            destination = directory / f"{base_name} ({counter}){suffix}"
            counter += 1
        with open(destination, 'wb') as out:
            shutil.copyfileobj(f.file, out)
        stat = destination.stat()
        saved.append(TrafficFileInfo(
            name=destination.name,
            relative_path=destination.relative_to(BASE_PATH).as_posix(),
            size=stat.st_size,
            mime_type=f.content_type,
            created_at=datetime.fromtimestamp(stat.st_ctime),
            updated_at=datetime.fromtimestamp(stat.st_mtime)
        ))
    return UploadResponse(files=saved)


@router.get('/download')
def download_file(path: str = Query(..., description="Ruta relativa del archivo")):
    file_path = _resolve_relative(path)
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    return FileResponse(str(file_path), filename=file_path.name)


@router.delete('/files')
def delete_file(path: str = Query(..., description="Ruta relativa del archivo a eliminar")):
    file_path = _resolve_relative(path)
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    file_path.unlink()
    return {"message": "Archivo eliminado"}

@router.get('/preview/{relative_path:path}')
def preview_file(relative_path: str):
    """Previsualizar archivo (especialmente PDFs) en el navegador"""
    file_path = _resolve_relative(relative_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    if not file_path.is_file():
        raise HTTPException(status_code=400, detail="La ruta no corresponde a un archivo")
    
    # Obtener el tipo MIME
    import mimetypes
    content_type, _ = mimetypes.guess_type(str(file_path))
    if content_type is None:
        content_type = 'application/octet-stream'
    
    # Para PDFs, establecer content-type correcto para visualización
    if file_path.suffix.lower() == '.pdf':
        content_type = 'application/pdf'
    
    # Retornar archivo para visualización (sin forzar descarga)
    from fastapi.responses import FileResponse
    return FileResponse(
        path=str(file_path),
        media_type=content_type,
        headers={"Content-Disposition": "inline"}
    )



