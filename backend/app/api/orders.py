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

# Datos simulados
orders_db = [
    Order(
        id=1,
        order_number="ORD-2024-001",
        company_name="Empresa ABC S.L.",
        email_received_from="pedidos@empresaabc.com",
        subject="Pedido de materiales Q4 2024",
        received_date=datetime.now() - timedelta(days=2),
        status="pending",
        priority="high"
    ),
    Order(
        id=2,
        order_number="ORD-2024-002",
        company_name="Logística DEF Ltda.",
        email_received_from="compras@logisticadef.com",
        subject="Solicitud de transporte urgente",
        received_date=datetime.now() - timedelta(days=1),
        status="processing",
        priority="urgent"
    ),
    Order(
        id=3,
        order_number="ORD-2024-003",
        company_name="Servicios GHI Corp.",
        email_received_from="operaciones@serviciosghi.com",
        subject="Contrato de servicios mensual",
        received_date=datetime.now() - timedelta(hours=8),
        status="completed",
        priority="normal"
    ),
    Order(
        id=4,
        order_number="ORD-2024-004",
        company_name="Manufacturas JKL S.A.",
        email_received_from="ventas@manufactujasjkl.com",
        subject="Pedido especial productos personalizados",
        received_date=datetime.now() - timedelta(hours=3),
        status="pending",
        priority="normal"
    ),
    Order(
        id=5,
        order_number="ORD-2024-005",
        company_name="Distribuidora MNO",
        email_received_from="admin@distribuidoramnO.com",
        subject="Orden de compra mensual",
        received_date=datetime.now() - timedelta(minutes=45),
        status="pending",
        priority="low"
    )
]

order_documents_db = [
    OrderDocument(
        id=1,
        order_id=1,
        file_name="pedido_materiales_abc.pdf",
        file_url="/api/orders/documents/download/1",
        file_size=245760,
        file_type="application/pdf",
        uploaded_date=datetime.now() - timedelta(days=2),
        email_attachment_name="Pedido_Q4_2024.pdf"
    ),
    OrderDocument(
        id=2,
        order_id=1,
        file_name="especificaciones_tecnicas.pdf",
        file_url="/api/orders/documents/download/2",
        file_size=187392,
        file_type="application/pdf",
        uploaded_date=datetime.now() - timedelta(days=2),
        email_attachment_name="Especificaciones_Tecnicas.pdf"
    ),
    OrderDocument(
        id=3,
        order_id=2,
        file_name="solicitud_transporte_urgente.pdf",
        file_url="/api/orders/documents/download/3",
        file_size=312450,
        file_type="application/pdf",
        uploaded_date=datetime.now() - timedelta(days=1),
        email_attachment_name="Transporte_Urgente_DEF.pdf"
    ),
    OrderDocument(
        id=4,
        order_id=3,
        file_name="contrato_servicios_ghi.pdf",
        file_url="/api/orders/documents/download/4",
        file_size=445820,
        file_type="application/pdf",
        uploaded_date=datetime.now() - timedelta(hours=8),
        email_attachment_name="Contrato_Mensual_GHI.pdf"
    ),
    OrderDocument(
        id=5,
        order_id=4,
        file_name="pedido_personalizado_jkl.pdf",
        file_url="/api/orders/documents/download/5",
        file_size=298765,
        file_type="application/pdf",
        uploaded_date=datetime.now() - timedelta(hours=3),
        email_attachment_name="Productos_Personalizados.pdf"
    )
]

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
    
    # Simular documento adjunto
    fake_pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000079 00000 n \n0000000136 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n205\n%%EOF"
    
    # Crear registro de documento
    document_filename = f"{subject.lower().replace(' ', '_')}.pdf"
    new_document = OrderDocument(
        id=len(order_documents_db) + 1,
        order_id=new_order.id or 0,  # Asegurar que no sea None
        file_name=document_filename,
        file_url=f"/api/orders/documents/download/{len(order_documents_db) + 1}",
        file_size=len(fake_pdf_content),
        file_type="application/pdf",
        uploaded_date=datetime.now(),
        email_attachment_name=document_filename
    )
    
    order_documents_db.append(new_document)
    
    return {
        "message": "Correo electrónico simulado procesado correctamente",
        "order": new_order,
        "document": new_document
    }

@router.get("/documents/{document_id}/view")
async def view_order_document(document_id: int):
    """Ver un documento PDF de orden en el navegador"""
    document = next((doc for doc in order_documents_db if doc.id == document_id), None)
    if not document:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    # Simular contenido PDF
    fake_pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000079 00000 n \n0000000136 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n205\n%%EOF"
    
    return StreamingResponse(
        io.BytesIO(fake_pdf_content),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={document.file_name}"}
    )
