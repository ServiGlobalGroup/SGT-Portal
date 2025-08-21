from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import extract
from app.database.connection import get_db
from app.models.user import User
from app.models.vacation import VacationRequest, VacationStatus
from app.models.schemas import (
    VacationRequestCreate, 
    VacationRequestUpdate, 
    VacationRequestResponse, 
    VacationStats
)
from app.api.auth import get_current_user
from datetime import datetime, date
from typing import List, Optional

router = APIRouter()

@router.get("/", response_model=List[VacationRequestResponse])
async def get_vacation_requests(
    status_filter: Optional[str] = None,
    user_id: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene solicitudes de vacaciones con filtros opcionales.
    Los usuarios regulares solo pueden ver sus propias solicitudes.
    Los administradores pueden ver todas las solicitudes.
    """
    query = db.query(VacationRequest).options(
        joinedload(VacationRequest.user),
        joinedload(VacationRequest.reviewer)
    )
    
    # Si no es admin, solo puede ver sus propias solicitudes
    if current_user.role.value not in ['ADMINISTRADOR', 'MASTER_ADMIN']:
        query = query.filter(VacationRequest.user_id == current_user.id)
    elif user_id:  # Los admins pueden filtrar por usuario específico
        query = query.filter(VacationRequest.user_id == user_id)
    
    # Filtro por estado
    if status_filter:
        query = query.filter(VacationRequest.status == status_filter)
    
    # Filtro por año
    if year:
        query = query.filter(
            extract('year', VacationRequest.start_date) == year
        )
    
    # Ordenar por fecha de creación descendente
    requests = query.order_by(VacationRequest.created_at.desc()).all()
    
    # Convertir a respuesta
    response = []
    for req in requests:
        response_item = VacationRequestResponse(
            id=req.id,
            user_id=req.user_id,
            start_date=req.start_date,
            end_date=req.end_date,
            reason=req.reason,
            status=req.status,
            admin_response=req.admin_response,
            reviewed_by=req.reviewed_by,
            reviewed_at=req.reviewed_at,
            created_at=req.created_at,
            updated_at=req.updated_at,
            duration_days=req.duration_days,
            employee_name=req.user.full_name if req.user else None,
            reviewer_name=req.reviewer.full_name if req.reviewer else None
        )
        response.append(response_item)
    
    return response

@router.post("/", response_model=VacationRequestResponse)
async def create_vacation_request(
    request: VacationRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Crea una nueva solicitud de vacaciones.
    Solo el usuario autenticado puede crear solicitudes para sí mismo.
    """
    
    # Validaciones adicionales
    if request.start_date < datetime.now():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha de inicio no puede ser anterior a hoy"
        )
    
    if request.end_date < request.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha de fin debe ser posterior a la fecha de inicio"
        )
    
    # Verificar si ya existe una solicitud en las mismas fechas
    overlapping = db.query(VacationRequest).filter(
        VacationRequest.user_id == current_user.id,
        VacationRequest.status.in_(['pending', 'approved']),
        VacationRequest.start_date <= request.end_date,
        VacationRequest.end_date >= request.start_date
    ).first()
    
    if overlapping:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una solicitud de vacaciones en ese período"
        )
    
    # Crear nueva solicitud
    db_request = VacationRequest(
        user_id=current_user.id,
        start_date=request.start_date,
        end_date=request.end_date,
        reason=request.reason,
        status=VacationStatus.PENDING
    )
    
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    
    # Cargar relaciones para la respuesta
    db_request = db.query(VacationRequest).options(
        joinedload(VacationRequest.user)
    ).filter(VacationRequest.id == db_request.id).first()
    
    return VacationRequestResponse(
        id=db_request.id,
        user_id=db_request.user_id,
        start_date=db_request.start_date,
        end_date=db_request.end_date,
        reason=db_request.reason,
        status=db_request.status,
        admin_response=db_request.admin_response,
        reviewed_by=db_request.reviewed_by,
        reviewed_at=db_request.reviewed_at,
        created_at=db_request.created_at,
        updated_at=db_request.updated_at,
        duration_days=db_request.duration_days,
        employee_name=db_request.user.full_name if db_request.user else None,
        reviewer_name=None
    )

@router.delete("/{request_id}")
async def delete_vacation_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Elimina una solicitud de vacaciones.
    Solo el propietario puede eliminar sus propias solicitudes pendientes.
    Los administradores pueden eliminar cualquier solicitud.
    """
    
    db_request = db.query(VacationRequest).filter(
        VacationRequest.id == request_id
    ).first()
    
    if not db_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitud no encontrada"
        )
    
    # Verificar permisos
    is_admin = current_user.role.value in ['ADMINISTRADOR', 'MASTER_ADMIN']
    is_owner = db_request.user_id == current_user.id
    
    if not (is_admin or is_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar esta solicitud"
        )
    
    # Los usuarios regulares solo pueden eliminar solicitudes pendientes
    if not is_admin and db_request.status != VacationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se pueden eliminar solicitudes pendientes"
        )
    
    db.delete(db_request)
    db.commit()
    
    return {"message": "Solicitud eliminada correctamente"}

@router.put("/{request_id}/status")
async def update_vacation_status(
    request_id: int, 
    status_value: str,
    admin_response: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Actualiza el estado de una solicitud de vacaciones.
    Solo para administradores.
    """
    
    # Verificar permisos de administrador
    if current_user.role.value not in ['ADMINISTRADOR', 'MASTER_ADMIN']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden cambiar el estado de las solicitudes"
        )
    
    # Validar estado
    try:
        vacation_status = VacationStatus(status_value)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Estado no válido"
        )
    
    # Buscar la solicitud
    db_request = db.query(VacationRequest).filter(
        VacationRequest.id == request_id
    ).first()
    
    if not db_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitud no encontrada"
        )
    
    # Actualizar el estado
    db_request.status = vacation_status
    db_request.reviewed_by = current_user.id
    db_request.reviewed_at = datetime.now()
    
    if admin_response:
        db_request.admin_response = admin_response
    
    db.commit()
    
    return {"message": "Estado actualizado correctamente"}

@router.get("/stats", response_model=VacationStats)
async def get_vacation_stats(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene estadísticas de las solicitudes de vacaciones.
    Los usuarios ven solo sus estadísticas, los admins ven todas.
    """
    
    current_year = year or datetime.now().year
    
    # Base query
    query = db.query(VacationRequest)
    
    # Si no es admin, solo sus propias solicitudes
    if current_user.role.value not in ['ADMINISTRADOR', 'MASTER_ADMIN']:
        query = query.filter(VacationRequest.user_id == current_user.id)
    
    # Todas las solicitudes
    total_requests = query.count()
    pending = query.filter(VacationRequest.status == VacationStatus.PENDING).count()
    approved = query.filter(VacationRequest.status == VacationStatus.APPROVED).count()
    rejected = query.filter(VacationRequest.status == VacationStatus.REJECTED).count()
    
    # Solicitudes del año actual
    current_year_query = query.filter(
        extract('year', VacationRequest.start_date) == current_year
    )
    current_year_total = current_year_query.count()
    current_year_approved = current_year_query.filter(
        VacationRequest.status == VacationStatus.APPROVED
    ).count()
    
    return VacationStats(
        total_requests=total_requests,
        pending=pending,
        approved=approved,
        rejected=rejected,
        current_year_total=current_year_total,
        current_year_approved=current_year_approved
    )

@router.get("/pending-for-admin", response_model=List[VacationRequestResponse])
async def get_pending_requests_for_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene solicitudes pendientes para el centro de notificaciones de administradores.
    """
    
    # Verificar permisos de administrador
    if current_user.role.value not in ['ADMINISTRADOR', 'MASTER_ADMIN']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden acceder a esta información"
        )
    
    # Obtener solicitudes pendientes
    requests = db.query(VacationRequest).options(
        joinedload(VacationRequest.user)
    ).filter(
        VacationRequest.status == VacationStatus.PENDING
    ).order_by(VacationRequest.created_at.desc()).all()
    
    response = []
    for req in requests:
        response_item = VacationRequestResponse(
            id=req.id,
            user_id=req.user_id,
            start_date=req.start_date,
            end_date=req.end_date,
            reason=req.reason,
            status=req.status,
            admin_response=req.admin_response,
            reviewed_by=req.reviewed_by,
            reviewed_at=req.reviewed_at,
            created_at=req.created_at,
            updated_at=req.updated_at,
            duration_days=req.duration_days,
            employee_name=req.user.full_name if req.user else None,
            reviewer_name=None
        )
        response.append(response_item)
    
    return response
