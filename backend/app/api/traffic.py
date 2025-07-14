from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from app.models.schemas import TrafficData, TrafficFolder, TrafficDocument
from datetime import datetime, timedelta
from typing import List, Optional
import random
import os
import uuid
import shutil

router = APIRouter()

# Simulación de base de datos en memoria con datos de ejemplo
folders_db = [
    TrafficFolder(
        id=1,
        name="Transportes ABC S.A.",
        type="company",
        parent_id=None,
        created_date=datetime.now() - timedelta(days=30)
    ),
    TrafficFolder(
        id=2,
        name="Logística DEF Ltda.",
        type="company",
        parent_id=None,
        created_date=datetime.now() - timedelta(days=25)
    ),
    TrafficFolder(
        id=3,
        name="Servicios GHI Corp.",
        type="company",
        parent_id=None,
        created_date=datetime.now() - timedelta(days=20)
    ),
    TrafficFolder(
        id=4,
        name="Tractoras",
        type="vehicle_type",
        parent_id=1,
        created_date=datetime.now() - timedelta(days=15)
    ),
    TrafficFolder(
        id=5,
        name="Bateas",
        type="vehicle_type",
        parent_id=1,
        created_date=datetime.now() - timedelta(days=15)
    ),
    TrafficFolder(
        id=6,
        name="ABC-1234",
        type="vehicle",
        parent_id=4,
        created_date=datetime.now() - timedelta(days=10)
    ),
    TrafficFolder(
        id=7,
        name="ABC-5678",
        type="vehicle",
        parent_id=4,
        created_date=datetime.now() - timedelta(days=8)
    ),
    TrafficFolder(
        id=8,
        name="BAN-9012",
        type="vehicle",
        parent_id=5,
        created_date=datetime.now() - timedelta(days=5)
    )
]

documents_db = [
    TrafficDocument(
        id=1,
        name="Seguro_ABC-1234.pdf",
        file_url="/api/traffic/documents/download/1",
        file_size=245760,
        file_type="application/pdf",
        folder_id=6,
        uploaded_date=datetime.now() - timedelta(days=7),
        uploaded_by="Admin"
    ),
    TrafficDocument(
        id=2,
        name="ITV_ABC-1234.pdf",
        file_url="/api/traffic/documents/download/2",
        file_size=187392,
        file_type="application/pdf",
        folder_id=6,
        uploaded_date=datetime.now() - timedelta(days=5),
        uploaded_by="Admin"
    ),
    TrafficDocument(
        id=3,
        name="Permiso_Circulacion_BAN-9012.pdf",
        file_url="/api/traffic/documents/download/3",
        file_size=312450,
        file_type="application/pdf",
        folder_id=8,
        uploaded_date=datetime.now() - timedelta(days=3),
        uploaded_by="Admin"
    )
]

@router.get("/", response_model=List[TrafficData])
async def get_traffic_data():
    # Datos de ejemplo
    traffic_data = []
    for i in range(7):
        date = datetime.now() - timedelta(days=i)
        traffic_data.append(TrafficData(
            id=i,
            timestamp=date,
            page=f"page_{i}",
            visitors=random.randint(100, 1000),
            duration=random.uniform(30, 300)
        ))
    return traffic_data

@router.get("/analytics")
async def get_traffic_analytics():
    return {
        "total_visits": 15420,
        "unique_visitors": 8230,
        "bounce_rate": 0.35,
        "avg_session_duration": 180.5,
        "top_pages": [
            {"page": "/dashboard", "visits": 3420},
            {"page": "/documents", "visits": 2890},
            {"page": "/vacations", "visits": 1560},
            {"page": "/traffic", "visits": 1240}
        ]
    }

# Endpoints para gestión de carpetas
@router.get("/folders", response_model=List[TrafficFolder])
async def get_folders():
    return folders_db

@router.post("/folders", response_model=TrafficFolder)
async def create_folder(folder: TrafficFolder):
    new_folder = TrafficFolder(
        id=len(folders_db) + 1,
        name=folder.name,
        type=folder.type,
        parent_id=folder.parent_id,
        created_date=datetime.now()
    )
    folders_db.append(new_folder)
    return new_folder

@router.put("/folders/{folder_id}", response_model=TrafficFolder)
async def update_folder(folder_id: int, folder_update: TrafficFolder):
    for i, folder in enumerate(folders_db):
        if folder.id == folder_id:
            folders_db[i].name = folder_update.name
            folders_db[i].type = folder_update.type
            return folders_db[i]
    raise HTTPException(status_code=404, detail="Folder not found")

@router.delete("/folders/{folder_id}")
async def delete_folder(folder_id: int):
    global folders_db, documents_db
    
    # Eliminar documentos en la carpeta
    documents_db = [doc for doc in documents_db if doc.folder_id != folder_id]
    
    # Eliminar subcarpetas recursivamente
    def delete_subfolder(parent_id):
        subfolders = [f for f in folders_db if f.parent_id == parent_id]
        for subfolder in subfolders:
            documents_db = [doc for doc in documents_db if doc.folder_id != subfolder.id]
            delete_subfolder(subfolder.id)
        folders_db[:] = [f for f in folders_db if f.parent_id != parent_id]
    
    delete_subfolder(folder_id)
    
    # Eliminar la carpeta principal
    folders_db[:] = [f for f in folders_db if f.id != folder_id]
    
    return {"message": "Folder deleted successfully"}

# Endpoints para gestión de documentos
@router.get("/documents", response_model=List[TrafficDocument])
async def get_documents(folder_id: Optional[int] = None):
    if folder_id is None:
        return documents_db
    return [doc for doc in documents_db if doc.folder_id == folder_id]

@router.post("/documents/upload", response_model=List[TrafficDocument])
async def upload_documents(
    folder_id: int = Form(...),
    files: List[UploadFile] = File(...)
):
    uploaded_docs = []
    
    # Crear directorio si no existe
    upload_dir = f"uploads/traffic/{folder_id}"
    os.makedirs(upload_dir, exist_ok=True)
    
    for file in files:
        # Validar que el archivo tenga nombre
        if not file.filename:
            continue
            
        # Generar nombre único para el archivo
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else ''
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Guardar archivo
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Crear registro en la base de datos
        new_document = TrafficDocument(
            id=len(documents_db) + 1,
            name=file.filename,
            file_url=f"/api/traffic/documents/download/{len(documents_db) + 1}",
            file_size=os.path.getsize(file_path),
            file_type=file.content_type or "application/octet-stream",
            folder_id=folder_id,
            uploaded_date=datetime.now(),
            uploaded_by="Usuario"
        )
        
        documents_db.append(new_document)
        uploaded_docs.append(new_document)
    
    return uploaded_docs

@router.get("/documents/download/{document_id}")
async def download_document(document_id: int):
    document = next((doc for doc in documents_db if doc.id == document_id), None)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # En una implementación real, aquí buscarías el archivo real
    # Por ahora, retornamos un error indicando que es una simulación
    raise HTTPException(status_code=501, detail="Download simulation not implemented")

@router.delete("/documents/{document_id}")
async def delete_document(document_id: int):
    global documents_db
    
    document = next((doc for doc in documents_db if doc.id == document_id), None)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Eliminar archivo físico (en implementación real)
    # os.remove(document.file_path)
    
    # Eliminar de la base de datos
    documents_db[:] = [doc for doc in documents_db if doc.id != document_id]
    
    return {"message": "Document deleted successfully"}
