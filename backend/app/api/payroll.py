from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from fastapi.responses import FileResponse, StreamingResponse
from app.models.schemas import PayrollDocument, User, PayrollStats
from datetime import datetime
from typing import List, Optional
import os
import uuid
from pathlib import Path
import io

router = APIRouter()

# Directorio para almacenar archivos de nómina
PAYROLL_FILES_DIR = Path("backend/files/payroll")
PAYROLL_FILES_DIR.mkdir(parents=True, exist_ok=True)

# Base de datos simulada de usuarios (se debe reemplazar por consulta real a DB)
users_db = []

# Base de datos simulada de documentos de nómina
payroll_documents_db = []

def get_current_user():
    """Simulación de obtener el usuario actual (normalmente vendría del token de autenticación)"""
    return {"user_id": 1, "role": "admin"}  # Usuario admin para testing

# Endpoints para el usuario actual
@router.get("/my-documents", response_model=List[PayrollDocument])
async def get_my_documents(month: Optional[str] = None, current_user = Depends(get_current_user)):
    """Obtener documentos del usuario actual"""
    user_documents = [doc for doc in payroll_documents_db if doc.user_id == current_user["user_id"]]
    
    if month:
        user_documents = [doc for doc in user_documents if doc.month == month]
    
    return user_documents

@router.post("/upload", response_model=PayrollDocument)
async def upload_document(
    file: UploadFile = File(...),
    type: str = Form(...),
    month: str = Form(...),
    current_user = Depends(get_current_user)
):
    """Subir un documento del usuario actual"""
    if type not in ["nomina", "dieta"]:
        raise HTTPException(status_code=400, detail="Tipo de documento inválido")
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")
    
    # Generar nombre único para el archivo
    file_extension = file.filename.split('.')[-1]
    unique_filename = f"{type}_{current_user['user_id']}_{month}_{uuid.uuid4().hex[:8]}.{file_extension}"
    file_path = PAYROLL_FILES_DIR / unique_filename
    
    # Guardar archivo
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Crear registro en base de datos
    user = next((u for u in users_db if u.id == current_user["user_id"]), None)
    new_document = PayrollDocument(
        id=max([doc.id for doc in payroll_documents_db]) + 1,
        user_id=current_user["user_id"],
        user_name=user.name if user else "Usuario Desconocido",
        type=type,
        month=month,
        file_url=f"/files/payroll/{unique_filename}",
        file_name=file.filename,
        file_size=len(content),
        upload_date=datetime.now(),
        status="active"
    )
    
    payroll_documents_db.append(new_document)
    return new_document

# Endpoints para visualización y descarga
@router.get("/documents/{document_id}/view")
async def view_document(document_id: int, current_user = Depends(get_current_user)):
    """Ver un documento PDF en el navegador"""
    document = next((doc for doc in payroll_documents_db if doc.id == document_id), None)
    if not document:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    # Verificar permisos
    if current_user["role"] != "admin" and document.user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="No tienes permisos para ver este documento")
    
    # TODO: Implementar lectura real del archivo
    raise HTTPException(status_code=501, detail="Funcionalidad no implementada")

@router.get("/documents/{document_id}/download")
async def download_document(document_id: int, current_user = Depends(get_current_user)):
    """Descargar un documento PDF"""
    document = next((doc for doc in payroll_documents_db if doc.id == document_id), None)
    if not document:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    # Verificar permisos
    if current_user["role"] != "admin" and document.user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="No tienes permisos para descargar este documento")
    
    # TODO: Implementar descarga real del archivo
    raise HTTPException(status_code=501, detail="Funcionalidad no implementada")

@router.delete("/documents/{document_id}")
async def delete_document(document_id: int, current_user = Depends(get_current_user)):
    """Eliminar un documento"""
    global payroll_documents_db
    document = next((doc for doc in payroll_documents_db if doc.id == document_id), None)
    if not document:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    # Verificar permisos
    if current_user["role"] != "admin" and document.user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="No tienes permisos para eliminar este documento")
    
    # Eliminar archivo físico si existe
    file_path = PAYROLL_FILES_DIR / document.file_url.split('/')[-1]
    if file_path.exists():
        file_path.unlink()
    
    # Eliminar de la base de datos
    payroll_documents_db = [doc for doc in payroll_documents_db if doc.id != document_id]
    
    return {"message": "Documento eliminado correctamente"}

# Estadísticas
@router.get("/stats", response_model=PayrollStats)
async def get_payroll_stats():
    """Obtener estadísticas de documentos de nómina"""
    total_documents = len(payroll_documents_db)
    users_with_documents = len(set(doc.user_id for doc in payroll_documents_db))
    
    current_month = datetime.now().strftime("%Y-%m")
    current_month_uploads = len([doc for doc in payroll_documents_db if doc.month == current_month])
    
    total_size = sum(doc.file_size for doc in payroll_documents_db)
    
    by_type = {
        "nomina": len([doc for doc in payroll_documents_db if doc.type == "nomina"]),
        "dieta": len([doc for doc in payroll_documents_db if doc.type == "dieta"])
    }
    
    return PayrollStats(
        total_documents=total_documents,
        users_with_documents=users_with_documents,
        current_month_uploads=current_month_uploads,
        total_size=total_size,
        by_type=by_type
    )

# Endpoints de administrador
@router.get("/admin/users", response_model=List[User])
async def get_all_users(current_user = Depends(get_current_user)):
    """Obtener todos los usuarios (solo admins)"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado: se requieren permisos de administrador")
    
    return users_db

@router.get("/admin/users/{user_id}/documents", response_model=List[PayrollDocument])
async def get_user_documents(user_id: int, month: Optional[str] = None, current_user = Depends(get_current_user)):
    """Obtener documentos de un usuario específico (solo admins)"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado: se requieren permisos de administrador")
    
    user_documents = [doc for doc in payroll_documents_db if doc.user_id == user_id]
    
    if month:
        user_documents = [doc for doc in user_documents if doc.month == month]
    
    return user_documents

@router.get("/admin/documents", response_model=List[PayrollDocument])
async def get_all_documents(month: Optional[str] = None, type: Optional[str] = None, current_user = Depends(get_current_user)):
    """Obtener todos los documentos (solo admins)"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado: se requieren permisos de administrador")
    
    documents = payroll_documents_db.copy()
    
    if month:
        documents = [doc for doc in documents if doc.month == month]
    
    if type and type in ["nomina", "dieta"]:
        documents = [doc for doc in documents if doc.type == type]
    
    return documents

@router.post("/admin/upload", response_model=PayrollDocument)
async def upload_document_for_user(
    file: UploadFile = File(...),
    type: str = Form(...),
    month: str = Form(...),
    user_id: int = Form(...),
    current_user = Depends(get_current_user)
):
    """Subir un documento para cualquier usuario (solo admins)"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado: se requieren permisos de administrador")
    
    if type not in ["nomina", "dieta"]:
        raise HTTPException(status_code=400, detail="Tipo de documento inválido")
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")
    
    user = next((u for u in users_db if u.id == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Generar nombre único para el archivo
    file_extension = file.filename.split('.')[-1]
    unique_filename = f"{type}_{user_id}_{month}_{uuid.uuid4().hex[:8]}.{file_extension}"
    file_path = PAYROLL_FILES_DIR / unique_filename
    
    # Guardar archivo
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Crear registro en base de datos
    new_document = PayrollDocument(
        id=max([doc.id for doc in payroll_documents_db]) + 1,
        user_id=user_id,
        user_name=user.name,
        type=type,
        month=month,
        file_url=f"/files/payroll/{unique_filename}",
        file_name=file.filename,
        file_size=len(content),
        upload_date=datetime.now(),
        status="active"
    )
    
    payroll_documents_db.append(new_document)
    return new_document
