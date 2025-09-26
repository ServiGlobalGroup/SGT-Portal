# pyright: reportGeneralTypeIssues=false
"""API endpoints para inspecciones de camiones."""
import os
from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional, Tuple, cast
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Header
from fastapi import status as http_status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func, and_, or_

from app.database.connection import get_db
from app.models.user import User, UserRole, UserStatus
from app.models.truck_inspection import TruckInspection
from app.models.truck_inspection_request import TruckInspectionRequest, InspectionRequestStatus
from app.schemas.truck_inspection import (
    TruckInspectionCreate,
    TruckInspectionUpdate, 
    TruckInspectionResponse,
    TruckInspectionSummary,
    InspectionNeededResponse,
    InspectionStatsResponse,
    ImageUploadResponse,
    TruckInspectionRequestCreate,
    TruckInspectionRequestResult,
    TruckInspectionRequestRecipient,
    ManualInspectionRequest,
)
from app.api.auth import get_current_user
from app.services.activity_service import ActivityService
from app.utils.company_context import effective_company_for_request

router = APIRouter()

# Configuración
TRUCK_INSPECTION_FOLDER = "files/truck_inspections"
INSPECTION_INTERVAL_DAYS = 15  # 2 veces al mes = cada 15 días
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB


def _role_equals(role_value, expected: UserRole) -> bool:
    """Compara un valor de rol que puede venir como Enum, string o InstrumentedAttribute."""

    if isinstance(role_value, UserRole):
        return role_value == expected
    if hasattr(role_value, "value"):
        try:
            return getattr(role_value, "value") == expected.value
        except Exception:
            pass
    try:
        return UserRole(str(role_value)) == expected
    except Exception:
        return str(role_value).upper() == expected.value


def _role_in(role_value, roles: List[UserRole]) -> bool:
    return any(_role_equals(role_value, role) for role in roles)



def _build_inspection_summary(inspection: TruckInspection) -> TruckInspectionSummary:
    status_checks = [
        (cast(Optional[bool], inspection.tires_status), "neumáticos"),
        (cast(Optional[bool], inspection.brakes_status), "frenos"),
        (cast(Optional[bool], inspection.lights_status), "luces"),
        (cast(Optional[bool], inspection.fluids_status), "fluidos"),
        (cast(Optional[bool], inspection.documentation_status), "documentación"),
        (cast(Optional[bool], inspection.body_status), "carrocería"),
    ]

    components_with_issues = [
        component_name for status, component_name in status_checks if status is False
    ]

    company_raw = getattr(inspection, "company", None)
    company_value = getattr(company_raw, "value", company_raw)

    return TruckInspectionSummary(
        id=cast(int, inspection.id),
        user_id=cast(int, inspection.user_id),
        user_name=inspection.user.full_name if inspection.user else "Usuario desconocido",
        truck_license_plate=cast(str, inspection.truck_license_plate),
        has_issues=bool(cast(Optional[bool], getattr(inspection, "has_issues", False))),
        inspection_date=cast(datetime, inspection.inspection_date),
        components_with_issues=components_with_issues,
        company=cast(Optional[str], company_value),
        is_reviewed=bool(getattr(inspection, "is_reviewed", False)),
    )


def _compute_inspection_status(current_user: User, db: Session) -> InspectionNeededResponse:
    if not _role_equals(current_user.role, UserRole.TRABAJADOR):
        return InspectionNeededResponse(
            needs_inspection=False,
            last_inspection_date=None,
            next_inspection_date=None,
            days_since_last_inspection=None,
            message="Solo los trabajadores necesitan realizar inspecciones",
            inspection_interval_days=INSPECTION_INTERVAL_DAYS,
        )

    # La inspección automática está siempre habilitada

    pending_requests = (
        db.query(TruckInspectionRequest)
        .options(joinedload(TruckInspectionRequest.requester))
        .filter(
            TruckInspectionRequest.target_user_id == current_user.id,
            TruckInspectionRequest.status == InspectionRequestStatus.PENDING,
        )
        .order_by(desc(TruckInspectionRequest.created_at))
        .all()
    )

    manual_requests_payload = [
        ManualInspectionRequest(
            request_id=cast(int, request.id),
            requested_by=(request.requester.full_name if request.requester else None),
            message=cast(Optional[str], request.message),
            created_at=cast(datetime, request.created_at),
        )
        for request in pending_requests
    ]
    has_manual_requests = len(manual_requests_payload) > 0

    last_inspection = (
        db.query(TruckInspection)
        .filter(TruckInspection.user_id == current_user.id)
        .order_by(desc(TruckInspection.inspection_date))
        .first()
    )

    if not last_inspection:
        message = "Debes completar tu primera inspección de camión"
        if has_manual_requests:
            message = "Tienes una solicitud manual de inspección pendiente. " + message
        return InspectionNeededResponse(
            needs_inspection=True,
            last_inspection_date=None,
            next_inspection_date=None,
            days_since_last_inspection=None,
            message=message,
            manual_requests=manual_requests_payload or None,
            inspection_interval_days=INSPECTION_INTERVAL_DAYS,
        )

    last_inspection_date = cast(datetime, last_inspection.inspection_date)
    if last_inspection_date.tzinfo is None or last_inspection_date.utcoffset() is None:
        last_inspection_date = last_inspection_date.replace(tzinfo=timezone.utc)

    now_utc = datetime.now(timezone.utc)
    days_since = (now_utc - last_inspection_date).days
    next_inspection_date = last_inspection_date + timedelta(days=INSPECTION_INTERVAL_DAYS)

    # La inspección automática siempre está habilitada - verificar si necesita inspección por tiempo
    needs_due_interval = days_since >= INSPECTION_INTERVAL_DAYS
    needs_inspection = needs_due_interval or has_manual_requests

    message_parts: list[str] = []

    if has_manual_requests:
        if len(manual_requests_payload) == 1:
            requester_name = manual_requests_payload[0].requested_by or "el taller"
            message_parts.append(f"Solicitud manual enviada por {requester_name}.")
        else:
            message_parts.append(
                f"Tienes {len(manual_requests_payload)} solicitudes manuales de inspección pendientes."
            )

    message_parts.append(f"Última inspección hace {days_since} días.")
    message_parts.append(
        f"Próxima revisión programada para el {next_inspection_date.astimezone(timezone.utc).strftime('%d/%m/%Y')}"
    )

    if needs_inspection:
        message_parts.append("Realiza una nueva inspección a la mayor brevedad posible.")
    else:
        message_parts.append("Aún no es obligatorio realizarla.")

    message = " ".join(message_parts)

    return InspectionNeededResponse(
        needs_inspection=needs_inspection,
        last_inspection_date=last_inspection_date,
        next_inspection_date=next_inspection_date,
        days_since_last_inspection=days_since,
        message=message,
        manual_requests=manual_requests_payload or None,
        inspection_interval_days=INSPECTION_INTERVAL_DAYS,
    )


@router.get("/check-needed", response_model=InspectionNeededResponse)
async def check_inspection_needed(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Verifica si el usuario trabajador necesita realizar una inspección de camión.
    Solo disponible para usuarios con rol TRABAJADOR.
    """
    try:
        print(f"DEBUG: Usuario {current_user.id}, rol: {current_user.role}, tipo: {type(current_user.role)}")
        return _compute_inspection_status(current_user, db)

    except Exception as e:
        print(f"ERROR en check_inspection_needed: {str(e)}")
        print(f"Tipo de error: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno del servidor: {str(e)}"
        )


@router.get('/', response_model=List[TruckInspectionSummary])
async def get_inspections(
    user_id: Optional[int] = None,
    truck_license_plate: Optional[str] = None,
    has_issues: Optional[bool] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    x_company: Optional[str] = Header(None, alias="X-Company"),
):
    """
    Obtiene inspecciones con filtros opcionales.
    Los trabajadores solo ven sus propias inspecciones.
    El personal de taller y administradores ven todas las inspecciones de su empresa.
    """
    query = db.query(TruckInspection).options(
        joinedload(TruckInspection.user)
    )
    
    # Control de acceso por rol
    if _role_equals(current_user.role, UserRole.TRABAJADOR):
        # Los trabajadores solo ven sus propias inspecciones
        query = query.filter(TruckInspection.user_id == current_user.id)
    elif _role_in(current_user.role, [UserRole.P_TALLER, UserRole.ADMINISTRADOR, UserRole.ADMINISTRACION, UserRole.TRAFICO]):
        # Personal de taller y administradores ven inspecciones filtradas por empresa
        if user_id:
            query = query.filter(TruckInspection.user_id == user_id)
        
        # Aplicar filtro por empresa usando el contexto de empresa efectiva
        effective_company = effective_company_for_request(current_user, x_company)
        if effective_company is not None:
            query = query.filter(
                or_(
                    TruckInspection.company == effective_company,
                    and_(
                        TruckInspection.company.is_(None),
                        TruckInspection.user.has(User.company == effective_company)
                    )
                )
            )
        elif _role_in(current_user.role, [UserRole.ADMINISTRADOR, UserRole.ADMINISTRACION, UserRole.P_TALLER]):
            # Si es admin pero no tiene empresa definida, no mostrar nada por seguridad
            query = query.filter(TruckInspection.id == 0)  # Fuerza resultado vacío
    else:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para ver inspecciones"
        )
    
    # Aplicar filtros
    if truck_license_plate:
        query = query.filter(TruckInspection.truck_license_plate.ilike(f"%{truck_license_plate}%"))
    
    if has_issues is not None:
        query = query.filter(TruckInspection.has_issues == has_issues)
    
    # Ordenar por fecha descendente
    query = query.order_by(desc(TruckInspection.inspection_date))
    
    # Paginación
    inspections = query.offset(offset).limit(limit).all()
    
    # Convertir a formato de respuesta
    return [_build_inspection_summary(inspection) for inspection in inspections]


@router.post('/manual-requests', response_model=TruckInspectionRequestResult, status_code=http_status.HTTP_201_CREATED)
async def create_manual_inspection_requests(
    payload: TruckInspectionRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    x_company: Optional[str] = Header(None, alias="X-Company"),
):
    """Crea solicitudes manuales de inspección para trabajadores."""

    if not _role_in(current_user.role, [UserRole.P_TALLER, UserRole.ADMINISTRADOR, UserRole.ADMINISTRACION, UserRole.TRAFICO]):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para mandar inspecciones manuales",
        )

    effective_company = effective_company_for_request(current_user, x_company)

    base_query = db.query(User).filter(User.role == UserRole.TRABAJADOR)

    if effective_company is not None:
        base_query = base_query.filter(User.company == effective_company)

    if payload.send_to_all:
        target_users = base_query.all()
    else:
        target_users = base_query.filter(User.id.in_(payload.target_user_ids)).all()

    target_users = [user for user in target_users if getattr(user, "status", None) == UserStatus.ACTIVO]

    if not target_users:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="No se encontraron trabajadores válidos para la solicitud",
        )

    target_user_ids = [cast(int, user.id) for user in target_users]

    existing_pending = (
        db.query(TruckInspectionRequest)
        .filter(
            TruckInspectionRequest.target_user_id.in_(target_user_ids),
            TruckInspectionRequest.status == InspectionRequestStatus.PENDING,
        )
        .all()
    )

    pending_ids = {cast(int, pending.target_user_id) for pending in existing_pending}
    created_entries: List[Tuple[User, TruckInspectionRequest]] = []
    skipped_existing = 0

    for user in target_users:
        if user.id in pending_ids:
            skipped_existing += 1
            continue

        request = TruckInspectionRequest(
            requested_by=current_user.id,
            target_user_id=user.id,
            company=effective_company,
            message=payload.message,
            status=InspectionRequestStatus.PENDING,
        )
        db.add(request)
        created_entries.append((user, request))

    if created_entries:
        db.flush()

    recipients = [
        TruckInspectionRequestRecipient(
            request_id=cast(int, request.id),
            user_id=cast(int, user.id),
            user_name=user.full_name,
        )
        for user, request in created_entries
    ]

    created_count = len(created_entries)

    if created_entries:
        db.commit()

    missing_ids = []
    if not payload.send_to_all:
        requested_ids = set(payload.target_user_ids)
        found_ids = {cast(int, user.id) for user in target_users}
        missing_ids = sorted(requested_ids - found_ids)

    message_parts: list[str] = []
    if created_count:
        message_parts.append(f"Se crearon {created_count} solicitudes de inspección.")
    if skipped_existing:
        message_parts.append(f"{skipped_existing} trabajadores ya tenían una solicitud pendiente.")
    if missing_ids:
        message_parts.append(f"IDs ignorados por no pertenecer a la empresa o estar inactivos: {', '.join(map(str, missing_ids))}.")
    if not message_parts:
        message_parts.append("No se crearon nuevas solicitudes.")

    return TruckInspectionRequestResult(
        created_count=created_count,
        skipped_existing=skipped_existing,
        recipients=recipients,
        message=" ".join(message_parts),
    )


@router.post('/create', response_model=TruckInspectionResponse)
async def create_inspection(
    inspection_data: TruckInspectionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Crea una nueva inspección de camión.
    Solo disponible para usuarios con rol TRABAJADOR.
    """
    # Verificar que es un trabajador
    if not _role_equals(current_user.role, UserRole.TRABAJADOR):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Solo los trabajadores pueden crear inspecciones"
        )
    
    # Determinar si hay problemas
    has_issues = not all([
        inspection_data.tires_status,
        inspection_data.brakes_status,
        inspection_data.lights_status,
        inspection_data.fluids_status,
        inspection_data.documentation_status,
        inspection_data.body_status
    ])
    
    # Crear la inspección
    db_inspection = TruckInspection(
        user_id=current_user.id,
        truck_license_plate=inspection_data.truck_license_plate,
        
        tires_status=inspection_data.tires_status,
        tires_notes=inspection_data.tires_notes,
        
        brakes_status=inspection_data.brakes_status,
        brakes_notes=inspection_data.brakes_notes,
        
        lights_status=inspection_data.lights_status,
        lights_notes=inspection_data.lights_notes,
        
        fluids_status=inspection_data.fluids_status,
        fluids_notes=inspection_data.fluids_notes,
        
        documentation_status=inspection_data.documentation_status,
        documentation_notes=inspection_data.documentation_notes,
        
        body_status=inspection_data.body_status,
        body_notes=inspection_data.body_notes,
        
        has_issues=has_issues,
        general_notes=inspection_data.general_notes,
        company=current_user.company  # Heredar la empresa del trabajador
    )
    
    db.add(db_inspection)

    pending_manual_requests = (
        db.query(TruckInspectionRequest)
        .filter(
            TruckInspectionRequest.target_user_id == current_user.id,
            TruckInspectionRequest.status == InspectionRequestStatus.PENDING,
        )
        .all()
    )

    if pending_manual_requests:
        completion_time = datetime.now(timezone.utc)
        for request in pending_manual_requests:
            setattr(request, "status", InspectionRequestStatus.COMPLETED)
            setattr(request, "completed_at", completion_time)

    db.commit()
    db.refresh(db_inspection)
    
    # Registrar actividad
    # ActivityService.log_activity(
    #     db=db,
    #     user_id=current_user.id,
    #     action="truck_inspection_created",
    #     details=f"Inspección creada para camión {inspection_data.truck_license_plate}. {'Con incidencias' if has_issues else 'Sin incidencias'}"
    # )
    
    # Preparar respuesta
    response = TruckInspectionResponse.from_orm(db_inspection)
    response.user_name = current_user.full_name
    
    return response


@router.get("/{inspection_id}", response_model=TruckInspectionResponse)
async def get_inspection_detail(
    inspection_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene el detalle completo de una inspección.
    Los trabajadores solo pueden ver sus propias inspecciones.
    """
    inspection = db.query(TruckInspection).options(
        joinedload(TruckInspection.user)
    ).filter(TruckInspection.id == inspection_id).first()
    
    if not inspection:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Inspección no encontrada"
        )
    
    # Control de acceso
    if _role_equals(current_user.role, UserRole.TRABAJADOR) and inspection.user_id != current_user.id:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Solo puedes ver tus propias inspecciones"
        )
    elif not _role_in(current_user.role, [UserRole.TRABAJADOR, UserRole.P_TALLER, UserRole.ADMINISTRADOR, UserRole.ADMINISTRACION, UserRole.TRAFICO]):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para ver esta inspección"
        )
    
    response = TruckInspectionResponse.from_orm(inspection)
    response.user_name = inspection.user.full_name if inspection.user else "Usuario desconocido"
    
    return response


@router.get("/pending-issues/", response_model=List[TruckInspectionSummary])
async def get_pending_issues(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    x_company: Optional[str] = Header(None, alias="X-Company"),
):
    """
    Obtiene inspecciones con incidencias pendientes.
    Solo disponible para personal de taller y administradores.
    Filtra por empresa según el contexto del usuario y el header X-Company.
    """
    if not _role_in(current_user.role, [UserRole.P_TALLER, UserRole.ADMINISTRADOR, UserRole.ADMINISTRACION, UserRole.TRAFICO]):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Solo el personal de taller, administradores y tráfico pueden ver incidencias pendientes"
        )
    
    # Obtener inspecciones con problemas de los últimos 30 días y NO revisadas
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

    # Query base: incidencias recientes y no revisadas
    query = db.query(TruckInspection).options(
        joinedload(TruckInspection.user)
    ).filter(
        and_(
            TruckInspection.has_issues.is_(True),
            TruckInspection.inspection_date >= thirty_days_ago,
            TruckInspection.is_reviewed.is_(False)
        )
    )

    # Aplicar filtro por empresa usando el contexto de empresa efectiva
    # Los administradores y administración pueden cambiar de empresa con X-Company
    effective_company = effective_company_for_request(current_user, x_company)
    
    if effective_company is not None:
        # Filtrar por empresa efectiva (incluye inspecciones legacy con company NULL cuyo usuario pertenece a la empresa)
        query = query.filter(
            or_(
                TruckInspection.company == effective_company,
                and_(
                    TruckInspection.company.is_(None),
                    TruckInspection.user.has(User.company == effective_company)
                )
            )
        )
    elif current_user.role in [UserRole.ADMINISTRADOR, UserRole.ADMINISTRACION, UserRole.P_TALLER]:
        # Si es admin pero no tiene empresa definida, no mostrar nada por seguridad
        query = query.filter(TruckInspection.id == 0)  # Fuerza resultado vacío
    
    inspections = query.order_by(desc(TruckInspection.inspection_date)).all()

    return [_build_inspection_summary(inspection) for inspection in inspections]


@router.post("/{inspection_id}/mark-reviewed/", response_model=dict)
async def mark_inspection_reviewed(
    inspection_id: int,
    revision_notes: str = "",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Marca una inspección como revisada por personal de taller.
    Solo disponible para personal de taller y administradores.
    """
    if not _role_in(current_user.role, [UserRole.P_TALLER, UserRole.ADMINISTRADOR, UserRole.ADMINISTRACION]):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Solo el personal de taller y administradores pueden marcar inspecciones como revisadas"
        )
    
    # Buscar la inspección
    inspection = db.query(TruckInspection).filter(TruckInspection.id == inspection_id).first()
    
    if not inspection:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Inspección no encontrada"
        )
    
    # Verificar que la inspección tiene problemas
    if not bool(getattr(inspection, "has_issues", False)):
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Solo se pueden marcar como revisadas las inspecciones con problemas"
        )
    
    # Verificar que no está ya revisada
    if bool(getattr(inspection, "is_reviewed", False)):
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Esta inspección ya está marcada como revisada"
        )
    
    # Marcar como revisada
    setattr(inspection, "is_reviewed", True)
    setattr(inspection, "reviewed_by", current_user.id)
    setattr(inspection, "reviewed_at", datetime.now(timezone.utc))
    setattr(inspection, "revision_notes", revision_notes)
    
    db.commit()
    
    return {
        "message": "Inspección marcada como revisada exitosamente",
        "inspection_id": inspection_id,
        "reviewed_by": current_user.full_name,
        "reviewed_at": getattr(inspection, "reviewed_at", None)
    }


@router.post("/{inspection_id}/upload-image", response_model=ImageUploadResponse)
async def upload_inspection_image(
    inspection_id: int,
    component: str,  # tires, brakes, lights, fluids, documentation, body
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sube una imagen para un componente específico de la inspección.
    Solo el usuario que creó la inspección puede subir imágenes.
    """
    print(f"DEBUG: Upload image - inspection_id={inspection_id}, component={component}")
    
    # Validar componente
    valid_components = ["tires", "brakes", "lights", "fluids", "documentation", "body"]
    if component not in valid_components:
        print(f"ERROR: Componente inválido: {component}")
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Componente inválido. Debe ser uno de: {', '.join(valid_components)}"
        )
    
    # Buscar la inspección
    inspection = db.query(TruckInspection).filter(TruckInspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Inspección no encontrada"
        )
    
    # Verificar que el usuario puede modificar esta inspección
    if _role_equals(current_user.role, UserRole.TRABAJADOR) and inspection.user_id != current_user.id:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Solo puedes subir imágenes a tus propias inspecciones"
        )
    
    # Validar archivo
    if not file.filename:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="No se proporcionó archivo"
        )
    
    file_extension = os.path.splitext(file.filename.lower())[1]
    if file_extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de archivo no permitido. Extensiones válidas: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
        )
    
    # Verificar tamaño
    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="El archivo es demasiado grande (máximo 10MB)"
        )
    
    try:
        # Crear directorio si no existe
        os.makedirs(TRUCK_INSPECTION_FOLDER, exist_ok=True)
        
        # Generar nombre único para el archivo
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        filename = f"inspection_{inspection_id}_{component}_{timestamp}{file_extension}"
        file_path = os.path.join(TRUCK_INSPECTION_FOLDER, filename)
        
        # Guardar archivo
        with open(file_path, "wb") as buffer:
            buffer.write(contents)
        
        # Actualizar la inspección con la ruta de la imagen
        field_name = f"{component}_image_path"
        print(f"DEBUG: Intentando setattr con field_name={field_name}")
        
        # Verificar que el campo existe
        if not hasattr(inspection, field_name):
            print(f"ERROR: El modelo no tiene el campo {field_name}")
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Campo {field_name} no encontrado en el modelo"
            )
        
        setattr(inspection, field_name, file_path)
        print(f"DEBUG: setattr exitoso para {field_name}={file_path}")
        db.commit()
        print("DEBUG: Commit exitoso")
        
        # Registrar actividad
        ActivityService.log_from_user(
            db=db,
            user=current_user,
            event_type=ActivityService.EVENT_FILE_UPLOAD,
            message=f"Imagen subida para componente {component} de inspección {inspection_id}",
            entity_type="truck_inspection",
            entity_id=str(inspection_id),
            meta={
                "component": component,
                "image_path": file_path,
                "action": "truck_inspection_image_uploaded"
            }
        )
        
        return ImageUploadResponse(
            success=True,
            image_path=file_path,
            message=f"Imagen guardada correctamente para {component}"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error guardando imagen: {str(e)}"
        )


@router.get("/stats/", response_model=InspectionStatsResponse)
async def get_inspection_stats(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene estadísticas de inspecciones.
    Solo disponible para personal de taller y administradores.
    """
    if not _role_in(current_user.role, [UserRole.P_TALLER, UserRole.ADMINISTRADOR, UserRole.ADMINISTRACION, UserRole.TRAFICO]):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para ver estadísticas"
        )
    
    # Filtro de fecha
    since_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Estadísticas básicas
    total_query = db.query(TruckInspection).filter(TruckInspection.inspection_date >= since_date)
    total_inspections = total_query.count()
    
    inspections_with_issues = total_query.filter(TruckInspection.has_issues == True).count()
    inspections_ok = total_inspections - inspections_with_issues
    
    percentage_with_issues = (inspections_with_issues / total_inspections * 100) if total_inspections > 0 else 0
    
    # Problemas más comunes
    most_common_issues = {}
    problematic_inspections = total_query.filter(TruckInspection.has_issues == True).all()
    
    for inspection in problematic_inspections:
        status_checks = [
            (cast(Optional[bool], inspection.tires_status), "neumáticos"),
            (cast(Optional[bool], inspection.brakes_status), "frenos"),
            (cast(Optional[bool], inspection.lights_status), "luces"),
            (cast(Optional[bool], inspection.fluids_status), "fluidos"),
            (cast(Optional[bool], inspection.documentation_status), "documentación"),
            (cast(Optional[bool], inspection.body_status), "carrocería"),
        ]

        for status, component_name in status_checks:
            if status is False:
                most_common_issues[component_name] = most_common_issues.get(component_name, 0) + 1
    
    # Inspecciones recientes con problemas
    recent_inspections = db.query(TruckInspection).options(
        joinedload(TruckInspection.user)
    ).filter(
        and_(
            TruckInspection.has_issues == True,
            TruckInspection.inspection_date >= since_date
        )
    ).order_by(desc(TruckInspection.inspection_date)).limit(10).all()
    
    recent_summaries = [_build_inspection_summary(inspection) for inspection in recent_inspections]
    
    return InspectionStatsResponse(
        total_inspections=total_inspections,
        inspections_with_issues=inspections_with_issues,
        inspections_ok=inspections_ok,
        percentage_with_issues=round(percentage_with_issues, 2),
        most_common_issues=most_common_issues,
        recent_inspections=recent_summaries
    )


@router.get("/image/{image_path:path}")
async def get_inspection_image(
    image_path: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Sirve las imágenes de inspecciones de camiones.
    Solo disponible para usuarios autenticados.
    """
    try:
        # Decodificar la ruta de la imagen
        import urllib.parse
        decoded_path = urllib.parse.unquote(image_path)
        
        # Construir la ruta completa
        if os.path.isabs(decoded_path):
            full_path = decoded_path
        else:
            full_path = os.path.join(TRUCK_INSPECTION_FOLDER, decoded_path)
        
        # Verificar que el archivo existe y está en la carpeta permitida
        if not os.path.exists(full_path):
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Imagen no encontrada"
            )
        
        # Verificar que está dentro de la carpeta de inspecciones (seguridad)
        abs_inspection_folder = os.path.abspath(TRUCK_INSPECTION_FOLDER)
        abs_file_path = os.path.abspath(full_path)
        
        if not abs_file_path.startswith(abs_inspection_folder):
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Acceso denegado"
            )
        
        return FileResponse(
            full_path,
            media_type="image/jpeg",  # Será ajustado automáticamente por FastAPI según la extensión
            headers={"Cache-Control": "public, max-age=3600"}  # Cache de 1 hora
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error sirviendo imagen: {str(e)}"
        )

