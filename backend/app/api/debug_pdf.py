"""Endpoint de debug para PDFs"""
from fastapi import APIRouter, File, UploadFile, Depends, HTTPException
from app.models.user import User
from app.api.auth import get_current_active_user
from app.config import settings
import tempfile
import os

debug_router = APIRouter()

def _is_admin(current_user: User) -> bool:
    """Verificar si el usuario actual es administrador"""
    try:
        role_value = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
        return role_value in ("ADMINISTRADOR", "MASTER_ADMIN")
    except Exception:
        return False

def _import_pdf_processor():
    """Importación perezosa del procesador de PDFs"""
    try:
        from app.services.payroll_pdf_service import PayrollPDFProcessor
        return PayrollPDFProcessor
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Servicio de procesamiento de PDF no disponible: {e}"
        )

@debug_router.post("/debug-pdf")
async def debug_pdf_processing(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """Endpoint de debug para verificar el procesamiento de PDF"""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    if not getattr(file, 'filename', None) or not str(file.filename).lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")
    
    try:
        # Crear archivo temporal
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        # Verificar archivo
        debug_info = {
            "file_name": file.filename,
            "file_size": len(content),
            "temp_file_path": temp_file_path,
            "temp_file_exists": os.path.exists(temp_file_path),
            "temp_file_size": os.path.getsize(temp_file_path) if os.path.exists(temp_file_path) else 0
        }
        
        # Probar PyMuPDF
        ProcessorCls = _import_pdf_processor()
        processor = ProcessorCls(settings.user_files_base_path)
        
        # Usar método de debug del procesador
        pdf_debug = processor.debug_text_extraction(temp_file_path, 0)
        debug_info.update(pdf_debug)
        
        # Limpiar archivo temporal
        os.unlink(temp_file_path)
        
        return debug_info
        
    except Exception as e:
        return {"error": str(e), "error_type": type(e).__name__}
