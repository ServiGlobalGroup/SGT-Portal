from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from fastapi.responses import FileResponse, StreamingResponse
from app.models.schemas import PayrollDocument, User as UserSchema, PayrollStats
from app.models.user import UploadHistory, User
from app.database.connection import get_db
from app.config import settings
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
import os
import uuid
from pathlib import Path
import io
import tempfile
from app.api.auth import get_current_active_user

router = APIRouter()

# Directorio para almacenar archivos de nómina
PAYROLL_FILES_DIR = Path("backend/files/payroll")
PAYROLL_FILES_DIR.mkdir(parents=True, exist_ok=True)

# Base de datos simulada de usuarios (se debe reemplazar por consulta real a DB)
users_db = []

# Base de datos simulada de documentos de nómina
payroll_documents_db = []

def _is_admin(current_user: User) -> bool:
    try:
        role_value = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
        return role_value in ("ADMINISTRADOR", "ADMIN")
    except Exception:
        return False


def _import_pdf_processor():
    """Importación perezosa del procesador de PDFs para evitar requerir PyMuPDF al iniciar la app.

    Returns:
        Clase PayrollPDFProcessor si la importación tiene éxito.

    Raises:
        HTTPException 503 si la dependencia no está disponible.
    """
    try:
        from app.services.payroll_pdf_service import PayrollPDFProcessor  # type: ignore
        return PayrollPDFProcessor
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=(
                "Servicio de procesamiento de PDF no disponible: falta dependencia PyMuPDF. "
                "Instala 'PyMuPDF' en el entorno o usa una versión de Python con wheel precompilado. "
                f"Detalle: {e}"
            ),
        )

# Endpoints para el usuario actual
@router.get("/my-documents", response_model=List[PayrollDocument])
async def get_my_documents(month: Optional[str] = None, current_user: User = Depends(get_current_active_user)):
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
    current_user: User = Depends(get_current_active_user)
):
    """Subir un documento del usuario actual"""
    if type not in ["nomina", "dieta"]:
        raise HTTPException(status_code=400, detail="Tipo de documento inválido")
    
    if not getattr(file, 'filename', None) or not str(file.filename).lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")
    
    # Generar nombre único para el archivo
    file_extension = str(file.filename).split('.')[-1]
    unique_filename = f"{type}_{current_user['user_id']}_{month}_{uuid.uuid4().hex[:8]}.{file_extension}"
    file_path = PAYROLL_FILES_DIR / unique_filename
    
    # Guardar archivo
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Crear registro en base de datos
    user = next((u for u in users_db if u.id == getattr(current_user, "id", None)), None)
    new_document = PayrollDocument(
        id=(max([doc.id for doc in payroll_documents_db]) + 1) if payroll_documents_db else 1,
        user_id=getattr(current_user, "id", 0),
        user_name=(getattr(current_user, "full_name", None) or f"{getattr(current_user, 'first_name', '')} {getattr(current_user, 'last_name', '')}").strip() or "Usuario",
        type=type,
        month=month,
        file_url=f"/files/payroll/{unique_filename}",
    file_name=file.filename or "archivo.pdf",
        file_size=len(content),
        upload_date=datetime.now(),
        status="active"
    )
    
    payroll_documents_db.append(new_document)
    return new_document

# Endpoints para visualización y descarga
@router.get("/documents/{document_id}/view")
async def view_document(document_id: int, current_user: User = Depends(get_current_active_user)):
    """Ver un documento PDF en el navegador"""
    document = next((doc for doc in payroll_documents_db if doc.id == document_id), None)
    if not document:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    # Verificar permisos
    if (not _is_admin(current_user)) and document.user_id != getattr(current_user, "id", None):
        raise HTTPException(status_code=403, detail="No tienes permisos para ver este documento")
    
    # TODO: Implementar lectura real del archivo
    raise HTTPException(status_code=501, detail="Funcionalidad no implementada")

@router.get("/documents/{document_id}/download")
async def download_document(document_id: int, current_user: User = Depends(get_current_active_user)):
    """Descargar un documento PDF"""
    document = next((doc for doc in payroll_documents_db if doc.id == document_id), None)
    if not document:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    # Verificar permisos
    if (not _is_admin(current_user)) and document.user_id != getattr(current_user, "id", None):
        raise HTTPException(status_code=403, detail="No tienes permisos para descargar este documento")
    
    # TODO: Implementar descarga real del archivo
    raise HTTPException(status_code=501, detail="Funcionalidad no implementada")

@router.delete("/documents/{document_id}")
async def delete_document(document_id: int, current_user: User = Depends(get_current_active_user)):
    """Eliminar un documento"""
    global payroll_documents_db
    document = next((doc for doc in payroll_documents_db if doc.id == document_id), None)
    if not document:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    # Verificar permisos
    if (not _is_admin(current_user)) and document.user_id != getattr(current_user, "id", None):
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

# Endpoint para procesar PDFs con múltiples nóminas
@router.post("/process-multiple-payrolls")
async def process_multiple_payrolls(
    file: UploadFile = File(...),
    month_year: str = Form(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Procesa un PDF con múltiples nóminas, extrayendo cada página como PDF individual
    y asignándola al trabajador correspondiente basándose en el DNI/NIE encontrado.
    
    Args:
        file: Archivo PDF con múltiples nóminas
        month_year: Mes y año de las nóminas (ej: "junio_2025" o "2025-06")
        current_user: Usuario actual (debe ser admin)
    """
    # Verificar permisos de administrador
    if not _is_admin(current_user):
        raise HTTPException(
            status_code=403, 
            detail="Acceso denegado: se requieren permisos de administrador para procesar nóminas múltiples"
        )
    
    # Validar que el archivo sea PDF
    if not getattr(file, 'filename', None) or not str(file.filename).lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400, 
            detail="Solo se permiten archivos PDF"
        )
    
    # Validar tamaño del archivo (50MB máximo)
    if file.size and file.size > 50 * 1024 * 1024:
        raise HTTPException(
            status_code=400, 
            detail="El archivo es demasiado grande. Tamaño máximo: 50MB"
        )
    
    try:
        # Crear archivo temporal para procesar
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            # Leer el contenido del archivo subido
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        # Inicializar el procesador de PDFs (importación perezosa)
        ProcessorCls = _import_pdf_processor()
        processor = ProcessorCls(settings.user_files_base_path)

        # Procesar el PDF
        results = processor.process_payroll_pdf(temp_file_path, month_year, document_type="nominas")

        # Generar resumen legible
        summary = processor.get_processing_summary(results)

        # Limpiar archivo temporal
        os.unlink(temp_file_path)

        # Extraer mes y año del month_year
        try:
            if '_' in month_year:
                month_str, year_str = month_year.split('_')
            else:
                # Asumir formato YYYY-MM o similar
                year_str = month_year[:4]
                month_str = month_year[-2:]
        except Exception:
            month_str = "01"
            year_str = str(datetime.now().year)

        # Guardar en historial de subidas
        try:
            upload_history = UploadHistory(
                file_name=file.filename or "archivo_sin_nombre.pdf",
                upload_date=datetime.now(),
                user_dni=getattr(current_user, "dni_nie", ""),
                user_name=(getattr(current_user, "full_name", None) or f"{getattr(current_user, 'first_name', '')} {getattr(current_user, 'last_name', '')}").strip(),
                document_type="nominas",
                month=month_str.zfill(2),
                year=year_str,
                total_pages=results["total_pages"],
                successful_pages=results["successful_assignments"],
                failed_pages=results["failed_assignments"],
                status="completed" if results["failed_assignments"] == 0 else "partial"
            )
            db.add(upload_history)
            db.commit()
            db.refresh(upload_history)
        except Exception as e:
            print(f"Error guardando historial: {e}")
            # No interrumpir el proceso principal si falla el historial

        # Preparar respuesta
        response = {
            "success": True,
            "message": "Procesamiento completado",
            "filename": file.filename,
            "month_year": month_year,
            "stats": {
                "total_pages": results["total_pages"],
                "successful": results["successful_assignments"],
                "failed": results["failed_assignments"],
                "success_rate": round((results["successful_assignments"] / results["total_pages"]) * 100, 2) if results["total_pages"] > 0 else 0
            },
            "details": results.get("details", []),
            "errors": results.get("errors", []),
            "summary": summary,
            "results": results,
            "processed_at": datetime.now().isoformat()
        }

        # Si hay errores críticos, devolver código de error parcial
        if results["failed_assignments"] > 0:
            response["warning"] = f"Se procesaron {results['successful_assignments']} nóminas exitosamente, pero {results['failed_assignments']} fallaron."

        return response
    except Exception as e:
        # Limpiar archivo temporal si existe
        if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

        raise HTTPException(
            status_code=500,
            detail=f"Error procesando el archivo PDF: {str(e)}"
        )

@router.post("/process-multiple-dietas")
async def process_multiple_dietas(
    file: UploadFile = File(...),
    month_year: str = Form(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Procesa un PDF con múltiples dietas, extrayendo cada página como PDF individual
    y asignándola al trabajador correspondiente basándose en el DNI/NIE encontrado.
    
    Args:
        file: Archivo PDF con múltiples dietas
        month_year: Mes y año de las dietas (ej: "junio_2025" o "2025-06")
        current_user: Usuario actual (debe ser admin)
    """
    # Verificar permisos de administrador
    if not _is_admin(current_user):
        raise HTTPException(
            status_code=403, 
            detail="Acceso denegado: se requieren permisos de administrador para procesar dietas múltiples"
        )
    
    # Validar que el archivo sea PDF
    if not getattr(file, 'filename', None) or not str(file.filename).lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400, 
            detail="Solo se permiten archivos PDF"
        )
    
    # Validar tamaño del archivo (50MB máximo)
    if file.size and file.size > 50 * 1024 * 1024:
        raise HTTPException(
            status_code=400, 
            detail="El archivo es demasiado grande. Tamaño máximo: 50MB"
        )
    
    try:
        # Crear archivo temporal para procesar
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            # Leer el contenido del archivo subido
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        # Inicializar el procesador de PDFs (importación perezosa)
        ProcessorCls = _import_pdf_processor()
        processor = ProcessorCls(settings.user_files_base_path)

        # Procesar el PDF como dietas
        results = processor.process_payroll_pdf(temp_file_path, month_year, document_type="dietas")

        # Generar resumen legible
        summary = processor.get_processing_summary(results)

        # Limpiar archivo temporal
        os.unlink(temp_file_path)

        # Extraer mes y año del month_year
        try:
            if '_' in month_year:
                month_str, year_str = month_year.split('_')
            else:
                # Asumir formato YYYY-MM o similar
                year_str = month_year[:4]
                month_str = month_year[-2:]
        except Exception:
            month_str = "01"
            year_str = str(datetime.now().year)

        # Guardar en historial de subidas
        try:
            upload_history = UploadHistory(
                file_name=file.filename or "archivo_sin_nombre.pdf",
                upload_date=datetime.now(),
                user_dni=getattr(current_user, "dni_nie", ""),
                user_name=(getattr(current_user, "full_name", None) or f"{getattr(current_user, 'first_name', '')} {getattr(current_user, 'last_name', '')}").strip(),
                document_type="dietas",
                month=month_str.zfill(2),
                year=year_str,
                total_pages=results["total_pages"],
                successful_pages=results["successful_assignments"],
                failed_pages=results["failed_assignments"],
                status="completed" if results["failed_assignments"] == 0 else "partial"
            )
            db.add(upload_history)
            db.commit()
            db.refresh(upload_history)
        except Exception as e:
            print(f"Error guardando historial: {e}")
            # No interrumpir el proceso principal si falla el historial

        # Preparar respuesta
        response = {
            "success": True,
            "message": "Procesamiento de dietas completado",
            "filename": file.filename,
            "month_year": month_year,
            "document_type": "dietas",
            "stats": {
                "total_pages": results["total_pages"],
                "successful": results["successful_assignments"],
                "failed": results["failed_assignments"],
                "success_rate": round((results["successful_assignments"] / results["total_pages"]) * 100, 2) if results["total_pages"] > 0 else 0
            },
            "details": results.get("details", []),
            "errors": results.get("errors", []),
            "summary": summary,
            "results": results,
            "processed_at": datetime.now().isoformat()
        }

        # Si hay errores críticos, devolver código de error parcial
        if results["failed_assignments"] > 0:
            response["warning"] = f"Se procesaron {results['successful_assignments']} dietas exitosamente, pero {results['failed_assignments']} fallaron."

        return response
    except Exception as e:
        # Limpiar archivo temporal si existe
        if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

        raise HTTPException(
            status_code=500,
            detail=f"Error procesando el archivo PDF de dietas: {str(e)}"
        )

@router.get("/processing-status/{process_id}")
async def get_processing_status(process_id: str, current_user: User = Depends(get_current_active_user)):
    """
    Obtiene el estado de procesamiento de un PDF (para futuras implementaciones asíncronas).
    """
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    # Por ahora retornamos un estado mock
    # En una implementación real, consultaríamos una base de datos o cache
    return {
        "process_id": process_id,
        "status": "completed",
        "message": "Funcionalidad de seguimiento en desarrollo"
    }

# Endpoints de administrador
@router.get("/admin/users", response_model=List[UserSchema])
async def get_all_users(current_user: User = Depends(get_current_active_user)):
    """Obtener todos los usuarios (solo admins)"""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Acceso denegado: se requieren permisos de administrador")
    
    return users_db

@router.get("/admin/users/{user_id}/documents", response_model=List[PayrollDocument])
async def get_user_documents(user_id: int, month: Optional[str] = None, current_user: User = Depends(get_current_active_user)):
    """Obtener documentos de un usuario específico (solo admins)"""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Acceso denegado: se requieren permisos de administrador")
    
    user_documents = [doc for doc in payroll_documents_db if doc.user_id == user_id]
    
    if month:
        user_documents = [doc for doc in user_documents if doc.month == month]
    
    return user_documents

@router.get("/admin/documents", response_model=List[PayrollDocument])
async def get_all_documents(month: Optional[str] = None, type: Optional[str] = None, current_user: User = Depends(get_current_active_user)):
    """Obtener todos los documentos (solo admins)"""
    if not _is_admin(current_user):
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
    current_user: User = Depends(get_current_active_user)
):
    """Subir un documento para cualquier usuario (solo admins)"""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Acceso denegado: se requieren permisos de administrador")
    
    if type not in ["nomina", "dieta"]:
        raise HTTPException(status_code=400, detail="Tipo de documento inválido")
    
    if not getattr(file, 'filename', None) or not str(file.filename).lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")
    
    user = next((u for u in users_db if u.id == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Generar nombre único para el archivo
    file_extension = str(file.filename).split('.')[-1]
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
    file_name=file.filename or "archivo.pdf",
        file_size=len(content),
        upload_date=datetime.now(),
        status="active"
    )
    
    payroll_documents_db.append(new_document)
    return new_document
