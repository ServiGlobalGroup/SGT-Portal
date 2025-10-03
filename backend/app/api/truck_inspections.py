# pyright: reportGeneralTypeIssues=false
"""API endpoints para inspecciones de camiones."""
import json
import os
from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional, Tuple, cast
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Header
from fastapi import status as http_status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func, and_, or_

from app.database.connection import get_db
from app.models.user import MasterAdminUser, User, UserRole, UserStatus
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
    AutoInspectionSettings,
    AutoInspectionSettingsUpdate,
)
from app.schemas.direct_inspection_order import (
    DirectInspectionOrderCreate,
    DirectInspectionOrderResponse,
    DirectInspectionOrderModuleOut,
    DirectInspectionOrderSummary,
    MarkDirectOrderReviewedRequest,
)
from app.models.direct_inspection_order import (
    DirectInspectionOrder,
    DirectInspectionOrderModule,
    VehicleKind,
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
AUTO_INSPECTION_SETTINGS_FILE = "truck_inspection_settings.json"

AUTO_INSPECTION_MANAGEMENT_ROLES: list[UserRole] = [
    UserRole.P_TALLER,
    UserRole.ADMINISTRADOR,
    UserRole.ADMINISTRACION,
    UserRole.TRAFICO,
    UserRole.MASTER_ADMIN,
]

DIRECT_ORDER_CREATION_ROLES: list[UserRole] = [
    UserRole.P_TALLER,
    UserRole.ADMINISTRADOR,
    UserRole.ADMINISTRACION,
    UserRole.TRAFICO,
    UserRole.MASTER_ADMIN,
]


def _load_auto_inspection_settings() -> AutoInspectionSettings:
    """Carga la configuración de inspecciones automáticas desde archivo."""

    if not os.path.exists(AUTO_INSPECTION_SETTINGS_FILE):
        default_settings = AutoInspectionSettings(
            auto_inspection_enabled=True,
            updated_at=None,
            updated_by=None,
            updated_by_id=None,
        )
        _save_auto_inspection_settings(default_settings)
        return default_settings

    try:
        with open(AUTO_INSPECTION_SETTINGS_FILE, "r", encoding="utf-8") as file:
            data = json.load(file)
        return AutoInspectionSettings.model_validate(data)
    except Exception as exc:  # pragma: no cover - fallback
        print(f"ERROR cargando configuración de inspecciones automáticas: {exc}")
        return AutoInspectionSettings(
            auto_inspection_enabled=True,
            updated_at=None,
            updated_by=None,
            updated_by_id=None,
        )


def _save_auto_inspection_settings(settings: AutoInspectionSettings) -> None:
    """Guarda la configuración de inspecciones automáticas en archivo."""

    try:
        with open(AUTO_INSPECTION_SETTINGS_FILE, "w", encoding="utf-8") as file:
            json.dump(settings.model_dump(mode="json"), file, ensure_ascii=False, indent=2)
    except Exception as exc:  # pragma: no cover - filesystem issues
        print(f"ERROR guardando configuración de inspecciones automáticas: {exc}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo guardar la configuración de inspecciones automáticas.",
        )


def _user_can_manage_auto_settings(user: User | MasterAdminUser) -> bool:
    """Determina si el usuario puede gestionar la configuración automática."""

    if isinstance(user, MasterAdminUser):
        return True

    role_value = getattr(user, "role", None)
    return role_value is not None and _role_in(role_value, AUTO_INSPECTION_MANAGEMENT_ROLES)


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
    settings = _load_auto_inspection_settings()
    auto_enabled = settings.auto_inspection_enabled

    if not _role_equals(current_user.role, UserRole.TRABAJADOR):
        return InspectionNeededResponse(
            needs_inspection=False,
            last_inspection_date=None,
            next_inspection_date=None,
            days_since_last_inspection=None,
            message="Solo los trabajadores necesitan realizar inspecciones",
            inspection_interval_days=INSPECTION_INTERVAL_DAYS,
            auto_inspection_enabled=auto_enabled,
        )

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
        if has_manual_requests:
            message = "Tienes una solicitud manual de inspección pendiente. Realiza la inspección para atenderla."
            return InspectionNeededResponse(
                needs_inspection=True,
                last_inspection_date=None,
                next_inspection_date=None,
                days_since_last_inspection=None,
                message=message,
                manual_requests=manual_requests_payload or None,
                inspection_interval_days=INSPECTION_INTERVAL_DAYS,
                auto_inspection_enabled=auto_enabled,
            )

        if auto_enabled:
            message = "Debes completar tu primera inspección de camión."
            return InspectionNeededResponse(
                needs_inspection=True,
                last_inspection_date=None,
                next_inspection_date=None,
                days_since_last_inspection=None,
                message=message,
                manual_requests=None,
                inspection_interval_days=INSPECTION_INTERVAL_DAYS,
                auto_inspection_enabled=auto_enabled,
            )

        message = (
            "Las inspecciones automáticas están desactivadas temporalmente. "
            "Recibirás recordatorios únicamente si el taller lo solicita manualmente."
        )
        return InspectionNeededResponse(
            needs_inspection=False,
            last_inspection_date=None,
            next_inspection_date=None,
            days_since_last_inspection=None,
            message=message,
            manual_requests=None,
            inspection_interval_days=INSPECTION_INTERVAL_DAYS,
            auto_inspection_enabled=auto_enabled,
        )

    last_inspection_date = cast(datetime, last_inspection.inspection_date)
    if last_inspection_date.tzinfo is None or last_inspection_date.utcoffset() is None:
        last_inspection_date = last_inspection_date.replace(tzinfo=timezone.utc)

    now_utc = datetime.now(timezone.utc)
    days_since = (now_utc - last_inspection_date).days
    next_inspection_date: Optional[datetime] = None
    if auto_enabled:
        next_inspection_date = last_inspection_date + timedelta(days=INSPECTION_INTERVAL_DAYS)
        if next_inspection_date.tzinfo is None or next_inspection_date.utcoffset() is None:
            next_inspection_date = next_inspection_date.replace(tzinfo=timezone.utc)

    needs_due_interval = auto_enabled and days_since >= INSPECTION_INTERVAL_DAYS
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

    if auto_enabled:
        message_parts.append(f"Última inspección hace {days_since} días.")
        if next_inspection_date is not None:
            message_parts.append(
                "Próxima revisión programada para el "
                f"{next_inspection_date.astimezone(timezone.utc).strftime('%d/%m/%Y')}"
            )

        if needs_inspection:
            if needs_due_interval:
                message_parts.append(
                    "Han pasado 15 días desde la última revisión, realiza una nueva inspección."
                )
            else:
                message_parts.append("Atiende la solicitud manual a la mayor brevedad posible.")
        else:
            message_parts.append("Aún no es obligatorio realizarla.")
    else:
        message_parts.append(
            "Las inspecciones automáticas cada 15 días están desactivadas temporalmente."
        )
        message_parts.append(f"Última inspección hace {days_since} días.")
        if has_manual_requests:
            message_parts.append("Atiende la solicitud manual lo antes posible.")
        else:
            message_parts.append(
                "Solo recibirás avisos manuales mientras dure la suspensión de revisiones automáticas."
            )

    message = " ".join(message_parts)

    return InspectionNeededResponse(
        needs_inspection=needs_inspection,
        last_inspection_date=last_inspection_date,
        next_inspection_date=next_inspection_date,
        days_since_last_inspection=days_since,
        message=message,
        manual_requests=manual_requests_payload or None,
        inspection_interval_days=INSPECTION_INTERVAL_DAYS,
        auto_inspection_enabled=auto_enabled,
    )


@router.post("/direct-orders", response_model=DirectInspectionOrderResponse, status_code=http_status.HTTP_201_CREATED)
async def create_direct_inspection_order(
    payload: DirectInspectionOrderCreate,
    current_user: User | MasterAdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    x_company: Optional[str] = Header(None, alias="X-Company"),
):
    """Crea una orden directa de inspección (taller) con módulos estructurados.

    Permite a roles superiores (taller / administración / tráfico / master) registrar incidencias
    antes de la revisión periódica. Devuelve la orden con sus módulos.
    """

    # Verificación de permiso
    role_value = getattr(current_user, "role", None)
    if not _role_in(role_value, DIRECT_ORDER_CREATION_ROLES):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para crear órdenes directas.",
        )

    effective_company = effective_company_for_request(current_user, x_company)

    # Normalizar matrícula (ya se normaliza en schema, redundante pero asegura consistencia)
    plate = payload.truck_license_plate.strip().upper()

    # Crear la orden
    order = DirectInspectionOrder(
        truck_license_plate=plate,
        vehicle_kind=payload.vehicle_kind,
        company=effective_company,
        created_by_id=getattr(current_user, "id", None),
    )
    db.add(order)
    db.flush()  # Obtener ID para relacionar módulos

    module_entities: list[DirectInspectionOrderModule] = []
    for module_in in payload.modules:
        module_entity = DirectInspectionOrderModule(
            order_id=order.id,
            title=module_in.title.strip(),
            notes=(module_in.notes.strip() if module_in.notes else None),
        )
        db.add(module_entity)
        module_entities.append(module_entity)

    db.commit()
    db.refresh(order)
    for m in module_entities:
        db.refresh(m)

    creator_name = getattr(current_user, "full_name", None) or getattr(current_user, "username", "Usuario")
    creator_id = getattr(current_user, "id", None)

    # Extraer valores simples (evita problemas de tipado estático con Column[])
    order_id_val = getattr(order, "id")
    truck_plate_val = getattr(order, "truck_license_plate")
    vehicle_kind_val = getattr(order, "vehicle_kind")
    created_at_val = getattr(order, "created_at")

    modules_out: list[DirectInspectionOrderModuleOut] = []
    for m in module_entities:
        modules_out.append(
            DirectInspectionOrderModuleOut(
                id=getattr(m, "id"),
                title=getattr(m, "title"),
                notes=getattr(m, "notes"),
                created_at=getattr(m, "created_at"),
            )
        )

    return DirectInspectionOrderResponse(
        order_id=order_id_val,
        truck_license_plate=truck_plate_val,
        vehicle_kind=vehicle_kind_val,
        created_at=created_at_val,
        created_by=creator_name,
        created_by_id=creator_id or 0,
        modules=modules_out,
        is_reviewed=False,
        message="Orden directa creada correctamente",
    )


@router.get("/direct-orders", response_model=List[DirectInspectionOrderSummary])
async def get_direct_inspection_orders(
    is_reviewed: Optional[bool] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: User | MasterAdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    x_company: Optional[str] = Header(None, alias="X-Company"),
):
    """Obtiene listado de órdenes directas de inspección.
    
    Filtrable por estado de revisión. Personal de taller y administradores
    ven las órdenes de su empresa.
    """
    
    role_value = getattr(current_user, "role", None)
    if not _role_in(role_value, DIRECT_ORDER_CREATION_ROLES):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para ver órdenes directas.",
        )
    
    effective_company = effective_company_for_request(current_user, x_company)
    
    query = db.query(DirectInspectionOrder).options(
        joinedload(DirectInspectionOrder.created_by),
        joinedload(DirectInspectionOrder.modules)
    )
    
    # Filtrar por empresa
    if effective_company is not None:
        query = query.filter(DirectInspectionOrder.company == effective_company)
    
    # Filtrar por estado de revisión
    if is_reviewed is not None:
        query = query.filter(DirectInspectionOrder.is_reviewed == is_reviewed)
    
    query = query.order_by(desc(DirectInspectionOrder.created_at))
    orders = query.offset(offset).limit(limit).all()
    
    results = []
    for order in orders:
        creator_name = getattr(order.created_by, "full_name", None) if order.created_by else "Desconocido"
        company_val = getattr(order.company, "value", order.company) if order.company else None
        
        order_id_val = getattr(order, "id", 0)
        plate_val = getattr(order, "truck_license_plate", "")
        veh_kind_val = getattr(order, "vehicle_kind", VehicleKind.TRACTORA)  # Default
        created_at_val = getattr(order, "created_at", datetime.now(timezone.utc))
        is_reviewed_val = getattr(order, "is_reviewed", False)
        company_val = getattr(order, "company", None)
        
        results.append(DirectInspectionOrderSummary(
            id=int(order_id_val),
            truck_license_plate=str(plate_val),
            vehicle_kind=veh_kind_val,
            created_at=created_at_val,
            created_by=creator_name or "Desconocido",
            company=str(company_val) if company_val else None,
            is_reviewed=bool(is_reviewed_val),
            modules_count=len(order.modules) if order.modules else 0,
        ))
    
    return results


@router.get("/direct-orders/{order_id}", response_model=DirectInspectionOrderResponse)
async def get_direct_inspection_order_detail(
    order_id: int,
    current_user: User | MasterAdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Obtiene detalle completo de una orden directa incluyendo módulos."""
    
    role_value = getattr(current_user, "role", None)
    if not _role_in(role_value, DIRECT_ORDER_CREATION_ROLES):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para ver órdenes directas.",
        )
    
    order = db.query(DirectInspectionOrder).options(
        joinedload(DirectInspectionOrder.created_by),
        joinedload(DirectInspectionOrder.reviewed_by),
        joinedload(DirectInspectionOrder.modules)
    ).filter(DirectInspectionOrder.id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Orden directa no encontrada",
        )
    
    creator_name = getattr(order.created_by, "full_name", None) if order.created_by else "Desconocido"
    creator_id = order.created_by_id
    reviewer_name = getattr(order.reviewed_by, "full_name", None) if order.reviewed_by else None
    
    modules_out = [
        DirectInspectionOrderModuleOut(
            id=m.id,
            title=m.title,
            notes=m.notes,
            created_at=m.created_at,
        )
        for m in (order.modules or [])
    ]
    
    order_id_val = getattr(order, "id", 0)
    plate_val = getattr(order, "truck_license_plate", "")
    veh_kind_val = getattr(order, "vehicle_kind", VehicleKind.TRACTORA)  # Default
    created_at_val = getattr(order, "created_at", datetime.now(timezone.utc))
    is_reviewed_val = getattr(order, "is_reviewed", False)
    reviewed_at_val = getattr(order, "reviewed_at", None)
    revision_notes_val = getattr(order, "revision_notes", None)
    creator_id_val = getattr(order.created_by, "id", 0) if order.created_by else 0
    
    return DirectInspectionOrderResponse(
        order_id=int(order_id_val),
        truck_license_plate=str(plate_val),
        vehicle_kind=veh_kind_val,
        created_at=created_at_val,
        created_by=creator_name or "Desconocido",
        created_by_id=int(creator_id_val),
        modules=modules_out,
        is_reviewed=bool(is_reviewed_val),
        reviewed_by=reviewer_name,
        reviewed_at=reviewed_at_val,
        revision_notes=revision_notes_val,
    )


@router.patch("/direct-orders/{order_id}/mark-reviewed", response_model=dict)
async def mark_direct_order_reviewed(
    order_id: int,
    payload: MarkDirectOrderReviewedRequest,
    current_user: User | MasterAdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Marca una orden directa como revisada por personal de taller."""
    
    role_value = getattr(current_user, "role", None)
    if not _role_in(role_value, [UserRole.P_TALLER, UserRole.ADMINISTRADOR, UserRole.ADMINISTRACION]):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Solo el personal de taller y administradores pueden marcar órdenes como revisadas",
        )
    
    order = db.query(DirectInspectionOrder).filter(DirectInspectionOrder.id == order_id).first()
    
    if not order:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Orden directa no encontrada",
        )
    
    if order.is_reviewed:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="Esta orden ya está marcada como revisada",
        )
    
    # Marcar como revisada
    setattr(order, "is_reviewed", True)
    setattr(order, "reviewed_by_id", getattr(current_user, "id", None))
    setattr(order, "reviewed_at", datetime.now(timezone.utc))
    setattr(order, "revision_notes", payload.revision_notes)
    
    db.commit()
    
    reviewer_name = getattr(current_user, "full_name", None) or getattr(current_user, "username", "Equipo de Taller")
    
    return {
        "message": "Orden directa marcada como revisada exitosamente",
        "order_id": order_id,
        "reviewed_by": reviewer_name,
        "reviewed_at": order.reviewed_at,
    }

@router.get("/settings/auto-inspection", response_model=AutoInspectionSettings)
async def get_auto_inspection_settings_endpoint(
    current_user: User | MasterAdminUser = Depends(get_current_user),
):
    """Obtiene el estado actual de las inspecciones automáticas cada 15 días."""

    if not _user_can_manage_auto_settings(current_user):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para consultar esta configuración.",
        )

    return _load_auto_inspection_settings()


@router.put("/settings/auto-inspection", response_model=AutoInspectionSettings)
async def update_auto_inspection_settings_endpoint(
    payload: AutoInspectionSettingsUpdate,
    current_user: User | MasterAdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Actualiza el estado de las inspecciones automáticas cada 15 días."""

    if not _user_can_manage_auto_settings(current_user):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para modificar esta configuración.",
        )

    timestamp = datetime.now(timezone.utc)
    full_name = getattr(current_user, "full_name", None)
    if not full_name:
        first_name = getattr(current_user, "first_name", "")
        last_name = getattr(current_user, "last_name", "")
        full_name = (first_name + " " + last_name).strip() or None

    updated_settings = AutoInspectionSettings(
        auto_inspection_enabled=payload.auto_inspection_enabled,
        updated_at=timestamp,
        updated_by=full_name,
        updated_by_id=getattr(current_user, "id", None),
    )

    _save_auto_inspection_settings(updated_settings)

    try:
        ActivityService.log_from_user(
            db,
            user=current_user,
            event_type=ActivityService.EVENT_OTHER,
            message=(
                "Inspecciones automáticas cada 15 días "
                + ("activadas" if payload.auto_inspection_enabled else "desactivadas")
            ),
            entity_type="truck_inspections",
            entity_id="auto_settings",
            meta={
                "auto_inspection_enabled": payload.auto_inspection_enabled,
                "timestamp": timestamp.isoformat(),
            },
        )
    except Exception as exc:  # pragma: no cover - logging shouldn't break request
        print(f"ERROR registrando actividad de configuración de inspecciones: {exc}")

    return updated_settings


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

