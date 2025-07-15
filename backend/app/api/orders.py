from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse, StreamingResponse
from typing import List, Optional
from datetime import datetime, timedelta
import random
import uuid
import os
import shutil
from pathlib import Path
import io
from ..models.schemas import Order, OrderDocument

router = APIRouter(prefix="/api/orders", tags=["orders"])

# Directorio para almacenar archivos de órdenes
ORDERS_FILES_DIR = Path("backend/files/orders")
ORDERS_FILES_DIR.mkdir(parents=True, exist_ok=True)

# Base de datos simulada
orders_db = []

order_documents_db = []

@router.get("/", response_model=List[Order])
async def get_orders():
    """Obtener todas las órdenes"""
    return orders_db

@router.get("/{order_id}", response_model=Order)
async def get_order(order_id: int):
    """Obtener una orden específica"""
    order = next((order for order in orders_db if order.id == order_id), None)
    if not order:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    return order

@router.get("/{order_id}/documents", response_model=List[OrderDocument])
async def get_order_documents(order_id: int):
    """Obtener documentos de una orden específica"""
    documents = [doc for doc in order_documents_db if doc.order_id == order_id]
    return documents

@router.get("/documents/download/{document_id}")
async def download_order_document(document_id: int):
    """Descargar un documento específico de orden"""
    document = next((doc for doc in order_documents_db if doc.id == document_id), None)
    if not document:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    # En una implementación real, aquí se retornaría el archivo
    return {"download_url": document.file_url, "filename": document.file_name}

@router.put("/{order_id}/status")
async def update_order_status(order_id: int, status: str):
    """Actualizar el estado de una orden"""
    order = next((order for order in orders_db if order.id == order_id), None)
    if not order:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    
    valid_statuses = ["pending", "processing", "completed", "cancelled"]
    if status not in valid_statuses:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Estado inválido")
    
    order.status = status
    return {"message": "Estado actualizado correctamente", "order": order}

@router.get("/stats/summary")
async def get_orders_stats():
    """Obtener estadísticas de órdenes"""
    total_orders = len(orders_db)
    pending_orders = len([o for o in orders_db if o.status == "pending"])
    processing_orders = len([o for o in orders_db if o.status == "processing"])
    completed_orders = len([o for o in orders_db if o.status == "completed"])
    cancelled_orders = len([o for o in orders_db if o.status == "cancelled"])
    
    total_documents = len(order_documents_db)
    total_size = sum(doc.file_size for doc in order_documents_db)
    
    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "processing_orders": processing_orders,
        "completed_orders": completed_orders,
        "cancelled_orders": cancelled_orders,
        "total_documents": total_documents,
        "total_size": total_size,
        "by_priority": {
            "low": len([o for o in orders_db if o.priority == "low"]),
            "normal": len([o for o in orders_db if o.priority == "normal"]),
            "high": len([o for o in orders_db if o.priority == "high"]),
            "urgent": len([o for o in orders_db if o.priority == "urgent"])
        }
    }

@router.post("/process-email")
async def process_email_order(
    sender_email: str = Form(...),
    subject: str = Form(...),
    company_name: str = Form(...),
    priority: str = Form("normal"),
    files: List[UploadFile] = File(...)
):
    """Procesar un correo electrónico con orden y adjuntos PDF"""
    if priority not in ["low", "normal", "high", "urgent"]:
        priority = "normal"
    
    # Generar número de orden único
    order_number = f"ORD-{datetime.now().year}-{len(orders_db) + 1:03d}"
    
    # Crear nueva orden
    new_order = Order(
        id=len(orders_db) + 1,
        order_number=order_number,
        company_name=company_name,
        email_received_from=sender_email,
        subject=subject,
        received_date=datetime.now(),
        status="pending",
        priority=priority
    )
    
    orders_db.append(new_order)
    
    # Procesar archivos adjuntos
    uploaded_docs = []
    
    for file in files:
        if not file.filename:
            continue
            
        # Validar que sea PDF
        if not file.filename.lower().endswith('.pdf'):
            continue
            
        # Generar nombre único para el archivo
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'pdf'
        unique_filename = f"order_{new_order.id}_{uuid.uuid4().hex[:8]}.{file_extension}"
        file_path = ORDERS_FILES_DIR / unique_filename
        
        # Guardar archivo
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Crear registro de documento
        new_document = OrderDocument(
            id=len(order_documents_db) + 1,
            order_id=new_order.id or 0,  # Asegurar que no sea None
            file_name=file.filename,
            file_url=f"/api/orders/documents/download/{len(order_documents_db) + 1}",
            file_size=len(content),
            file_type="application/pdf",
            uploaded_date=datetime.now(),
            email_attachment_name=file.filename
        )
        
        order_documents_db.append(new_document)
        uploaded_docs.append(new_document)
    
    return {
        "message": "Orden procesada correctamente",
        "order": new_order,
        "documents": uploaded_docs
    }

@router.post("/simulate-email")
async def simulate_email_order():
    """Simular la recepción de un correo electrónico con orden"""
    
    # Datos simulados para el correo
    companies = [
        "Construcciones XYZ S.L.", "Ingeniería ABC Corp.", "Servicios DEF Ltda.",
        "Manufacturas GHI S.A.", "Logística JKL Group", "Tecnología MNO Inc."
    ]
    
    subjects = [
        "Pedido urgente de materiales",
        "Solicitud de servicios de construcción",
        "Orden de compra mensual",
        "Contrato de mantenimiento",
        "Pedido especial productos",
        "Solicitud de consultoría"
    ]
    
    priorities = ["low", "normal", "high", "urgent"]
    
    # Generar datos aleatorios
    company = random.choice(companies)
    subject = random.choice(subjects)
    priority = random.choice(priorities)
    sender_email = f"pedidos@{company.lower().replace(' ', '').replace('.', '')}.com"
    
    # Generar número de orden único
    order_number = f"ORD-{datetime.now().year}-{len(orders_db) + 1:03d}"
    
    # Crear nueva orden
    new_order = Order(
        id=len(orders_db) + 1,
        order_number=order_number,
        company_name=company,
        email_received_from=sender_email,
        subject=subject,
        received_date=datetime.now(),
        status="pending",
        priority=priority
    )
    
    orders_db.append(new_order)
    
    # TODO: Implementar procesamiento real de archivos adjuntos
    
    return {
        "message": "Correo electrónico procesado correctamente",
        "order": new_order,
        "document": None  # Sin documento hasta implementar funcionalidad real
    }

@router.get("/documents/{document_id}/view")
async def view_order_document(document_id: int):
    """Ver un documento PDF de orden en el navegador"""
    document = next((doc for doc in order_documents_db if doc.id == document_id), None)
    if not document:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    # TODO: Implementar visualización real del archivo
    raise HTTPException(status_code=501, detail="Funcionalidad no implementada")
