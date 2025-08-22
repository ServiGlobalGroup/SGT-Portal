from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Query
from fastapi.responses import JSONResponse
from app.models.schemas import DashboardStats
from app.services.payroll_pdf_service import PayrollPDFProcessor
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.activity_log import ActivityLog
from app.models.user import User, UserRole
from app.models.vacation import VacationRequest, VacationStatus
from sqlalchemy import and_
from app.config import settings
from datetime import datetime
import tempfile
import os

router = APIRouter()

def get_current_user():
    """Simulación de obtener el usuario actual"""
    return {"user_id": 1, "role": "admin"}  # Usuario admin para testing

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    return DashboardStats(
        total_users=1250,
        active_sessions=48,
        total_documents=3420,
        pending_requests=12
    )

@router.get("/recent-activity")
async def get_recent_activity(limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    """Devuelve la actividad reciente real desde activity_log.

    Args:
        limit: número máximo de registros a devolver (1-100).
    """
    try:
        rows = (
            db.query(ActivityLog)
            .order_by(ActivityLog.created_at.desc())
            .limit(limit)
            .all()
        )
        return {"activities": [r.to_activity_item() for r in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo actividad: {e}")

@router.get("/available-workers")
async def get_available_workers(
    target_date: str = Query(..., description="Fecha objetivo YYYY-MM-DD"),
    db: Session = Depends(get_db)
):
    """Devuelve trabajadores (rol TRABAJADOR) activos y no de vacaciones en la fecha dada.

    Formato de respuesta:
    { "date": "YYYY-MM-DD", "available": [ {id, full_name, dni_nie} ] }
    """
    # Validar fecha
    from datetime import datetime
    try:
        day = datetime.strptime(target_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use YYYY-MM-DD")

    vacation_user_ids = [
        uid for (uid,) in db.query(VacationRequest.user_id).filter(
            VacationRequest.status == VacationStatus.APPROVED,
            VacationRequest.start_date <= day,
            VacationRequest.end_date >= day,
        ).all()
    ]

    query_workers = db.query(User).filter(
        User.role == UserRole.TRABAJADOR,
        User.is_active == True,  # noqa: E712
    )
    if vacation_user_ids:
        query_workers = query_workers.filter(User.id.notin_(vacation_user_ids))
    workers = query_workers.order_by(User.last_name.asc(), User.first_name.asc()).all()

    return {
        "date": target_date,
        "available": [
            {"id": u.id, "full_name": u.full_name, "dni_nie": u.dni_nie}
            for u in workers
        ],
    }

@router.post("/process-payroll-pdf")
async def process_payroll_pdf_upload(
    file: UploadFile = File(...),
    month_year: str = Form(...),
    current_user = Depends(get_current_user)
):
    """
    Endpoint del dashboard para procesar un PDF con múltiples nóminas.
    Este es el endpoint principal que usará el frontend desde la página de inicio.
    
    Args:
        file: Archivo PDF con múltiples nóminas
        month_year: Mes y año de las nóminas (ej: "junio_2025")
        current_user: Usuario actual
    """
    # Verificar permisos de administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=403, 
            detail="Acceso denegado: se requieren permisos de administrador"
        )
    
    # Validar que el archivo sea PDF
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400, 
            detail="Solo se permiten archivos PDF"
        )
    
    # Validar tamaño del archivo (50MB máximo)
    max_size = 50 * 1024 * 1024  # 50MB
    if file.size and file.size > max_size:
        raise HTTPException(
            status_code=400, 
            detail=f"El archivo es demasiado grande. Tamaño máximo: {max_size // (1024*1024)}MB"
        )
    
    try:
        # Crear archivo temporal para procesar
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            # Leer el contenido del archivo subido
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        # Inicializar el procesador de PDFs
        processor = PayrollPDFProcessor(settings.user_files_base_path)
        
        # Procesar el PDF
        results = processor.process_payroll_pdf(temp_file_path, month_year)
        
        # Limpiar archivo temporal
        os.unlink(temp_file_path)
        
        # Preparar respuesta para el dashboard
        response = {
            "success": True,
            "message": "PDF procesado exitosamente",
            "filename": file.filename,
            "month_year": month_year,
            "stats": {
                "total_pages": results["processed_pages"],
                "successful": results["successful_assignments"],
                "failed": results["failed_assignments"],
                "success_rate": round((results["successful_assignments"] / max(results["processed_pages"], 1)) * 100, 1)
            },
            "details": results["assignment_details"],
            "errors": results["errors"],
            "processed_at": datetime.now().isoformat()
        }
        
        # Si hay errores, incluir información adicional
        if results["failed_assignments"] > 0:
            response["warning"] = f"Algunas nóminas no se pudieron procesar automáticamente"
            response["requires_review"] = True
        
        return JSONResponse(content=response)
        
    except Exception as e:
        # Limpiar archivo temporal si existe
        if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        
        # Log del error para debugging
        print(f"Error procesando PDF: {str(e)}")
        
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Error procesando el archivo PDF",
                "error": str(e),
                "processed_at": datetime.now().isoformat()
            }
        )

@router.get("/payroll-folders-status")
async def get_payroll_folders_status(current_user = Depends(get_current_user)):
    """
    Verifica el estado de las carpetas de usuarios para mostrar información
    útil en el dashboard antes de procesar nóminas.
    """
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    try:
        processor = PayrollPDFProcessor(settings.user_files_base_path)
        user_files_path = settings.user_files_base_path
        
        # Listar todas las carpetas de usuarios
        user_folders = []
        if os.path.exists(user_files_path):
            for item in os.listdir(user_files_path):
                item_path = os.path.join(user_files_path, item)
                if os.path.isdir(item_path):
                    # Verificar si parece un DNI/NIE
                    if len(item) >= 8 and len(item) <= 9:
                        nominas_folder = os.path.join(item_path, "nominas")
                        user_folders.append({
                            "dni_nie": item,
                            "has_nominas_folder": os.path.exists(nominas_folder),
                            "nominas_count": len(os.listdir(nominas_folder)) if os.path.exists(nominas_folder) else 0
                        })
        
        return {
            "total_user_folders": len(user_folders),
            "folders_with_nominas": len([f for f in user_folders if f["has_nominas_folder"]]),
            "user_folders": user_folders[:10],  # Mostrar solo los primeros 10
            "base_path": user_files_path,
            "status": "ready"
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "error": f"Error verificando carpetas: {str(e)}",
                "status": "error"
            }
        )

@router.post("/debug-pdf-text")
async def debug_pdf_text_extraction(
    file: UploadFile = File(...),
    page_number: int = Form(0),
    current_user = Depends(get_current_user)
):
    """
    Endpoint de debug para analizar el texto extraído de una página específica de un PDF.
    Útil para entender por qué no se detecta el DNI/NIE.
    """
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos PDF")
    
    try:
        # Crear archivo temporal
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        # Inicializar procesador y hacer debug
        processor = PayrollPDFProcessor(settings.user_files_base_path)
        debug_info = processor.debug_text_extraction(temp_file_path, page_number)
        
        # Limpiar archivo temporal
        os.unlink(temp_file_path)
        
        return {
            "success": True,
            "filename": file.filename,
            "debug_info": debug_info
        }
        
    except Exception as e:
        if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        
        raise HTTPException(status_code=500, detail=f"Error en debug: {str(e)}")
