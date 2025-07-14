from fastapi import APIRouter
from app.models.schemas import Document
from datetime import datetime
from typing import List
import random

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
