from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi import status as http_status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import extract
from app.database.connection import get_db
from app.models.user import User
from app.models.vacation import VacationRequest, VacationStatus, AbsenceType as ModelAbsenceType
from app.models.schemas import (
    VacationRequestCreate, 
    VacationRequestUpdate, 
    VacationRequestResponse, 
    VacationStats,
    VacationUsage,
)
from app.services.activity_service import ActivityService
from app.api.auth import get_current_user
from datetime import datetime, date
from typing import List, Optional, Any, cast
import calendar
from app.utils.company_context import effective_company_for_request

router = APIRouter()

@router.get("/", response_model=List[VacationRequestResponse])
async def get_vacation_requests(
    status: Optional[str] = None,
    user_id: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    x_company: str | None = Header(default=None, alias="X-Company")
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
    # Filtro por empresa del usuario actual
    comp_obj = effective_company_for_request(current_user, x_company)
    if comp_obj is not None:
        query = query.filter(VacationRequest.company == comp_obj)
    
    # Si no es admin pleno, solo puede ver sus propias solicitudes
    if current_user.role.value not in ['ADMINISTRADOR', 'MASTER_ADMIN']:
        query = query.filter(VacationRequest.user_id == current_user.id)
    elif user_id:  # Los admins pueden filtrar por usuario específico
        query = query.filter(VacationRequest.user_id == user_id)
    
    # Filtro por estado
    if status:
        # Validar y normalizar estado al Enum
        try:
            status_enum = VacationStatus(status)
        except ValueError:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Estado no válido"
            )
        query = query.filter(VacationRequest.status == status_enum)
    
    # Filtro por año
    if year:
        query = query.filter(
            extract('year', VacationRequest.start_date) == year
        )
    
    # Ordenar por fecha de creación descendente
    requests = query.order_by(VacationRequest.created_at.desc()).all()
    
    # Formatear respuesta con datos adicionales
    response = []
    for req in requests:
        req_dict = {
            "id": req.id,
            "user_id": req.user_id,
            "start_date": req.start_date,
            "end_date": req.end_date,
            "reason": req.reason,
            "status": req.status,
            "admin_response": req.admin_response,
            "absence_type": req.absence_type,
            "reviewed_by": req.reviewed_by,
            "reviewed_at": req.reviewed_at,
            "created_at": req.created_at,
            "updated_at": req.updated_at,
            "duration_days": req.duration_days,
            "employee_name": req.user.full_name if req.user else None,
            "reviewer_name": req.reviewer.full_name if req.reviewer else None
        }
        response.append(VacationRequestResponse(**req_dict))
    
    return response

@router.post("/", response_model=VacationRequestResponse)
async def create_vacation_request(
    request: VacationRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    x_company: str | None = Header(default=None, alias="X-Company")
):
    """
    Crea una nueva solicitud de vacaciones.
    Solo el usuario autenticado puede crear solicitudes para sí mismo.
    """
    
    # Validaciones adicionales
    # Validar por fecha (ignorar hora) para evitar falsos negativos por zona horaria
    if request.start_date.date() < date.today():
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="La fecha de inicio no puede ser anterior a hoy"
        )
    
    if request.end_date < request.start_date:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="La fecha de fin debe ser posterior a la fecha de inicio"
        )
    
    # Verificar si ya existe una solicitud en las mismas fechas
    overlapping = db.query(VacationRequest).filter(
        VacationRequest.user_id == current_user.id,
        VacationRequest.status.in_([VacationStatus.PENDING, VacationStatus.APPROVED]),
        VacationRequest.start_date <= request.end_date,
        VacationRequest.end_date >= request.start_date
    ).first()
    
    if overlapping:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una solicitud de vacaciones en ese período"
        )
    
    # Crear nueva solicitud
    db_request = VacationRequest(
        user_id=current_user.id,
        start_date=request.start_date,
        end_date=request.end_date,
        reason=request.reason,
        status=VacationStatus.PENDING,
           # Asegurar conversión correcta de Enum Pydantic a Enum del modelo
           absence_type=ModelAbsenceType(
               request.absence_type.value if hasattr(request.absence_type, 'value') else str(request.absence_type)
           ),
           company=effective_company_for_request(current_user, x_company)
    )
    
    db.add(db_request)
    db.commit()
    db.refresh(db_request)

    # Log actividad
    try:
        days = (request.end_date.date() - request.start_date.date()).days + 1
        owner_is_actor = True  # siempre creación propia
        msg = f"Creó solicitud de vacaciones ({days} días)" if owner_is_actor else f"Solicitud de vacaciones creada ({days} días)"
        ActivityService.log_from_user(
            db,
            user=current_user,
            event_type=ActivityService.EVENT_VACATION_CREATED,
            message=msg,
            entity_type="vacation_request",
            entity_id=str(db_request.id),
            meta={
                "request_id": db_request.id,
                "start_date": request.start_date.isoformat(),
                "end_date": request.end_date.isoformat(),
                "days": days,
            },
        )
    except Exception:
        pass
    
    # Cargar relaciones para la respuesta
    db_request = db.query(VacationRequest).options(
        joinedload(VacationRequest.user)
    ).filter(VacationRequest.id == db_request.id).first()
    
    assert db_request is not None
    return {
        "id": db_request.id,
        "user_id": db_request.user_id,
        "start_date": db_request.start_date,
        "end_date": db_request.end_date,
        "reason": db_request.reason,
        "status": db_request.status,
    "absence_type": db_request.absence_type,
        "admin_response": db_request.admin_response,
        "reviewed_by": db_request.reviewed_by,
        "reviewed_at": db_request.reviewed_at,
        "created_at": db_request.created_at,
        "updated_at": db_request.updated_at,
        "duration_days": db_request.duration_days,
        "employee_name": db_request.user.full_name if db_request.user else None,
        "reviewer_name": None,
    }

@router.put("/{request_id}", response_model=VacationRequestResponse)
async def update_vacation_request(
    request_id: int,
    request_update: VacationRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    x_company: str | None = Header(default=None, alias="X-Company")
):
    """
    Actualiza una solicitud de vacaciones.
    Los usuarios pueden editar sus propias solicitudes pendientes.
    Los administradores pueden cambiar el estado y añadir respuestas.
    """
    
    db_request = db.query(VacationRequest).filter(
        VacationRequest.id == request_id
    ).first()
    
    if not db_request:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Solicitud no encontrada"
        )
    # Restringir por empresa
    comp_obj = effective_company_for_request(current_user, x_company)
    if comp_obj is not None and getattr(db_request, 'company', None) not in (None, comp_obj):
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Solicitud no encontrada"
        )
    
    # Verificar permisos
    is_admin = current_user.role.value in ['ADMINISTRADOR', 'MASTER_ADMIN']
    is_owner = cast(bool, db_request.user_id == current_user.id)
    
    if not (is_admin or is_owner):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar esta solicitud"
        )
    
    # Los usuarios regulares solo pueden editar solicitudes pendientes
    if not is_admin and cast(bool, db_request.status != VacationStatus.PENDING):
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Solo se pueden modificar solicitudes pendientes"
        )
    
    # Actualizar campos
    update_data = request_update.dict(exclude_unset=True)
    
    if 'status' in update_data and not is_admin:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden cambiar el estado"
        )
    
    # Si es admin cambiando el estado, registrar la revisión
    if is_admin and 'status' in update_data and cast(bool, update_data['status'] != db_request.status):
        update_data['reviewed_by'] = current_user.id
        update_data['reviewed_at'] = datetime.now()

    # Normalizar enums provenientes del schema (str Enums) a Enums del modelo
    if 'status' in update_data and update_data['status'] is not None:
        try:
            update_data['status'] = VacationStatus(str(update_data['status']))
        except Exception:
            pass
    if 'absence_type' in update_data and update_data['absence_type'] is not None:
        try:
            update_data['absence_type'] = ModelAbsenceType(str(update_data['absence_type']))
        except Exception:
            pass
    
    for field, value in update_data.items():
        setattr(db_request, field, value)
    
    db.commit()
    db.refresh(db_request)

    # Log actualización
    try:
        is_owner = is_owner  # ya calculado arriba
        campo_texto = ", ".join(update_data.keys()) if update_data else "sin cambios"
        if is_owner:
            msg = f"Actualizó su solicitud de vacaciones ({campo_texto})"
        else:
            empleado = db_request.user.full_name if db_request.user else "usuario"
            msg = f"Actualizó solicitud de vacaciones de {empleado} ({campo_texto})"
        ActivityService.log_from_user(
            db,
            user=current_user,
            event_type=ActivityService.EVENT_VACATION_UPDATED,
            message=msg,
            entity_type="vacation_request",
            entity_id=str(db_request.id),
            meta={
                "request_id": db_request.id,
                "updated_fields": list(update_data.keys()),
            },
        )
    except Exception:
        pass
    
    # Cargar relaciones para la respuesta
    db_request = db.query(VacationRequest).options(
        joinedload(VacationRequest.user),
        joinedload(VacationRequest.reviewer)
    ).filter(VacationRequest.id == request_id).first()
    
    assert db_request is not None
    return {
        "id": db_request.id,
        "user_id": db_request.user_id,
        "start_date": db_request.start_date,
        "end_date": db_request.end_date,
        "reason": db_request.reason,
        "status": db_request.status,
    "absence_type": db_request.absence_type,
        "admin_response": db_request.admin_response,
        "reviewed_by": db_request.reviewed_by,
        "reviewed_at": db_request.reviewed_at,
        "created_at": db_request.created_at,
        "updated_at": db_request.updated_at,
        "duration_days": db_request.duration_days,
        "employee_name": db_request.user.full_name if db_request.user else None,
        "reviewer_name": db_request.reviewer.full_name if db_request.reviewer else None,
    }

@router.delete("/{request_id}")
async def delete_vacation_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    x_company: str | None = Header(default=None, alias="X-Company")
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
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Solicitud no encontrada"
        )
    # Restringir por empresa
    comp_obj = effective_company_for_request(current_user, x_company)
    if comp_obj is not None and getattr(db_request, 'company', None) not in (None, comp_obj):
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Solicitud no encontrada"
        )
    
    # Verificar permisos
    is_admin = current_user.role.value in ['ADMINISTRADOR', 'MASTER_ADMIN']
    is_owner = cast(bool, db_request.user_id == current_user.id)
    
    if not (is_admin or is_owner):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para eliminar esta solicitud"
        )
    
    # Los usuarios regulares solo pueden eliminar solicitudes pendientes
    if not is_admin and cast(bool, db_request.status != VacationStatus.PENDING):
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Solo se pueden eliminar solicitudes pendientes"
        )
    
    db.delete(db_request)
    db.commit()
    try:
        msg = "Eliminó su solicitud de vacaciones" if is_owner else f"Eliminó solicitud de vacaciones de {db_request.user.full_name if db_request and db_request.user else 'usuario'}"
        ActivityService.log_from_user(
            db,
            user=current_user,
            event_type=ActivityService.EVENT_VACATION_UPDATED,
            message=msg,
            entity_type="vacation_request",
            entity_id=str(request_id),
            meta={"request_id": request_id},
        )
    except Exception:
        pass
    
    return {"message": "Solicitud eliminada correctamente"}

@router.put("/{request_id}/status")
async def update_vacation_status(
    request_id: int, 
    status: str,
    admin_response: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    x_company: str | None = Header(default=None, alias="X-Company")
):
    """
    Actualiza el estado de una solicitud de vacaciones.
    Solo para administradores.
    """
    
    # Verificar permisos de administrador
    if current_user.role.value not in ['ADMINISTRADOR', 'MASTER_ADMIN']:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden cambiar el estado de las solicitudes"
        )
    
    # Validar estado
    try:
        vacation_status = VacationStatus(status)
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Estado no válido"
        )
    
    # Buscar la solicitud
    db_request = db.query(VacationRequest).filter(
        VacationRequest.id == request_id
    ).first()
    
    if not db_request:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Solicitud no encontrada"
        )
    # Restringir por empresa efectiva: el admin solo debe actualizar solicitudes de la empresa activa
    comp_obj = effective_company_for_request(current_user, x_company)
    if comp_obj is not None and getattr(db_request, 'company', None) not in (None, comp_obj):
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Solicitud no encontrada"
        )
    
    # Actualizar el estado
    dbr: Any = db_request
    dbr.status = vacation_status
    dbr.reviewed_by = current_user.id
    dbr.reviewed_at = datetime.now()
    
    if admin_response:
        dbr.admin_response = admin_response
    
    db.commit()
    try:
        # Obtener nombre del solicitante para mensaje amigable
        owner_user = db.query(User).filter(User.id == dbr.user_id).first()
        empleado_nombre = owner_user.full_name if owner_user else "usuario"
        status_map = {"APPROVED": "aprobada", "REJECTED": "rechazada", "PENDING": "pendiente"}
        status_txt = status_map.get(vacation_status.value, vacation_status.value.lower())
        # Si el admin cambia la solicitud de otra persona, incluir el nombre
        if current_user.id != getattr(owner_user, 'id', None):
            msg = f"Solicitud de vacaciones de {empleado_nombre} {status_txt}"
        else:
            msg = f"Solicitud de vacaciones {status_txt}"
        ActivityService.log_from_user(
            db,
            user=current_user,
            event_type=ActivityService.EVENT_VACATION_STATUS,
            message=msg,
            entity_type="vacation_request",
            entity_id=str(request_id),
            meta={"request_id": request_id, "status": vacation_status.value, "admin_response": admin_response},
        )
    except Exception:
        pass
    
    return {"message": "Estado actualizado correctamente"}

@router.get("/stats", response_model=VacationStats)
async def get_vacation_stats(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    x_company: str | None = Header(default=None, alias="X-Company")
):
    """
    Obtiene estadísticas de las solicitudes de vacaciones.
    Los usuarios ven solo sus estadísticas, los admins ven todas.
    """
    
    current_year = year or datetime.now().year
    
    # Base query
    query = db.query(VacationRequest)
    # Filtrar por empresa
    comp_obj = effective_company_for_request(current_user, x_company)
    if comp_obj is not None:
        query = query.filter(VacationRequest.company == comp_obj)
    
    # Si no es admin pleno, solo sus propias solicitudes
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
    current_user: User = Depends(get_current_user),
    x_company: str | None = Header(default=None, alias="X-Company")
):
    """
    Obtiene solicitudes pendientes para el centro de notificaciones de administradores.
    """
    
    # Verificar permisos de administrador
    if current_user.role.value not in ['ADMINISTRADOR', 'MASTER_ADMIN']:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden acceder a esta información"
        )
    
    # Obtener solicitudes pendientes
    q = db.query(VacationRequest).options(
        joinedload(VacationRequest.user)
    ).filter(
        VacationRequest.status == VacationStatus.PENDING
    )
    comp_obj = effective_company_for_request(current_user, x_company)
    if comp_obj is not None:
        q = q.filter(VacationRequest.company == comp_obj)
    requests = q.order_by(VacationRequest.created_at.desc()).all()
    
    response = []
    for req in requests:
        req_dict = {
            "id": req.id,
            "user_id": req.user_id,
            "start_date": req.start_date,
            "end_date": req.end_date,
            "reason": req.reason,
            "status": req.status,
            "absence_type": req.absence_type,
            "admin_response": req.admin_response,
            "reviewed_by": req.reviewed_by,
            "reviewed_at": req.reviewed_at,
            "created_at": req.created_at,
            "updated_at": req.updated_at,
            "duration_days": req.duration_days,
            "employee_name": req.user.full_name if req.user else None,
            "reviewer_name": None
        }
        response.append(VacationRequestResponse(**req_dict))
    
    return response

@router.get("/usage", response_model=VacationUsage)
async def get_vacation_usage(
    user_id: int | None = None,
    year: int | None = None,
    absence_type: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    x_company: str | None = Header(default=None, alias="X-Company")
):
    """
    Devuelve el uso anual de días de vacaciones de un usuario.
    - approved_days_used: suma de días de solicitudes APROBADAS en el año.
    - pending_days_requested: suma de días de solicitudes PENDIENTES en el año (informativo para decisión del admin).
    Reglas de acceso:
      - Usuarios no admin: solo su propio uso (ignora user_id si es de otro usuario).
      - Admins: pueden consultar cualquier user_id; si no se pasa, se usa el propio.
    """
    target_year = year or datetime.now().year

    # Permisos y determinación de usuario objetivo
    is_admin = current_user.role.value in ['ADMINISTRADOR', 'MASTER_ADMIN']
    # Determinar usuario objetivo de forma segura
    base_user_id_any = getattr(current_user, 'id', None)
    if base_user_id_any is None:
        raise HTTPException(status_code=http_status.HTTP_401_UNAUTHORIZED, detail="Usuario no válido")
    base_user_id_int = int(base_user_id_any)
    if is_admin:
        target_user_id_val: int = int(user_id) if (user_id is not None) else base_user_id_int
    else:
        if (user_id is not None) and (int(user_id) != base_user_id_int):
            # Usuario regular intentando consultar a otro
            raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="No autorizado")
        target_user_id_val = base_user_id_int

    # Query base para el año
    q = db.query(VacationRequest).filter(
        VacationRequest.user_id == target_user_id_val,
        extract('year', VacationRequest.start_date) == target_year
    )
    comp_obj = effective_company_for_request(current_user, x_company)
    if comp_obj is not None:
        q = q.filter(VacationRequest.company == comp_obj)

    # Filtro opcional por tipo de ausencia
    if absence_type:
        try:
            at = ModelAbsenceType(absence_type)
            q = q.filter(VacationRequest.absence_type == at)
        except ValueError:
            raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="absence_type no válido")

    # Sumar días aprobados y pendientes
    approved_requests = q.filter(VacationRequest.status == VacationStatus.APPROVED).all()
    pending_q = db.query(VacationRequest).filter(
        VacationRequest.user_id == target_user_id_val,
        extract('year', VacationRequest.start_date) == target_year,
        VacationRequest.status == VacationStatus.PENDING
    )
    # Restringir por empresa también en pendientes
    if comp_obj is not None:
        pending_q = pending_q.filter(VacationRequest.company == comp_obj)
    if absence_type:
        pending_q = pending_q.filter(VacationRequest.absence_type == at)
    pending_requests = pending_q.all()

    approved_days_used = sum(req.duration_days for req in approved_requests)
    pending_days_requested = sum(req.duration_days for req in pending_requests)

    return VacationUsage(
        user_id=target_user_id_val,
        year=target_year,
        approved_days_used=int(approved_days_used),
        pending_days_requested=int(pending_days_requested),
    )
