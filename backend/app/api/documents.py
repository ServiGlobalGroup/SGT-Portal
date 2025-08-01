from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
from app.models.schemas import Document
from datetime import datetime
from typing import List
import random
import os
import shutil
from pathlib import Path

router = APIRouter()

# Datos de ejemplo en memoria
documents = [
    Document(
        id=1,
        title="Manual de Usuario",
        description="Guía completa para el uso del sistema",
        file_url="/files/manual-usuario.pdf",
        category="manual",
        uploaded_date=datetime.now(),
        size=2048000
    ),
    Document(
        id=2,
        title="Política de Vacaciones",
        description="Documento oficial sobre políticas de vacaciones",
        file_url="/files/politica-vacaciones.pdf",
        category="policy",
        uploaded_date=datetime.now(),
        size=1024000
    ),
    Document(
        id=3,
        title="Reporte de Tráfico Q1",
        description="Análisis de tráfico del primer trimestre",
        file_url="/files/reporte-trafico-q1.xlsx",
        category="report",
        uploaded_date=datetime.now(),
        size=512000
    )
]

@router.get("/", response_model=List[Document])
async def get_documents():
    return documents

@router.post("/", response_model=Document)
async def create_document(document: Document):
    new_id = max([doc.id for doc in documents]) + 1
    document.id = new_id
    document.uploaded_date = datetime.now()
    documents.append(document)
    return document

@router.get("/{document_id}", response_model=Document)
async def get_document(document_id: int):
    for doc in documents:
        if doc.id == document_id:
            return doc
    return None

@router.delete("/{document_id}")
async def delete_document(document_id: int):
    global documents
    documents = [doc for doc in documents if doc.id != document_id]
    return {"message": "Document deleted successfully"}

@router.get("/category/{category}")
async def get_documents_by_category(category: str):
    return [doc for doc in documents if doc.category == category]

@router.get("/stats/summary")
async def get_document_stats():
    return {
        "total_documents": len(documents),
        "total_size": sum(doc.size for doc in documents),
        "categories": {
            "manual": len([doc for doc in documents if doc.category == "manual"]),
            "policy": len([doc for doc in documents if doc.category == "policy"]),
            "report": len([doc for doc in documents if doc.category == "report"])
        }
    }

@router.post("/upload-general-documents")
async def upload_general_documents(file: UploadFile = File(...)):
    """
    Endpoint para subir documentos generales que estarán disponibles para todos los trabajadores.
    Estos documentos se almacenan en la carpeta 'documentos' y son visibles por todos.
    """
    # Validar el archivo
    if not file.filename:
        raise HTTPException(status_code=400, detail="No se proporcionó nombre de archivo")
    
    # Validar tipo de archivo (solo PDF por ahora)
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")
    
    # Validar tamaño (máximo 50MB)
    file_size = 0
    content = await file.read()
    file_size = len(content)
    
    if file_size > 50 * 1024 * 1024:  # 50MB
        raise HTTPException(status_code=400, detail="El archivo excede el tamaño máximo de 50MB")
    
    try:
        # Crear directorio para documentos generales si no existe
        upload_dir = Path("backend/files/general_documents")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generar nombre único para evitar conflictos
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{timestamp}_{file.filename}"
        file_path = upload_dir / safe_filename
        
        # Guardar el archivo
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # Crear registro del documento
        new_document = Document(
            id=len(documents) + 1,
            title=file.filename,
            description=f"Documento general: {file.filename}",
            file_url=str(file_path),
            category="general",
            uploaded_date=datetime.now(),
            size=file_size
        )
        
        documents.append(new_document)
        
        return {
            "success": True,
            "message": f"Documento '{file.filename}' subido exitosamente como documento general",
            "filename": file.filename,
            "size": file_size,
            "document_id": new_document.id,
            "stats": {
                "total_files": 1,
                "successful": 1,
                "failed": 0
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir el documento: {str(e)}")

@router.get("/download/general/{filename}")
async def download_general_document(filename: str):
    """
    Endpoint para descargar documentos generales.
    """
    file_path = Path("backend/files/general_documents") / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type='application/pdf'
    )
