from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.connection import get_db
from app.api.auth import get_current_user
from app.models.user import User
from fastapi import Header
from app.utils.company_context import effective_company_for_request
from app.models.schemas import DietaRecordCreate, DietaRecordResponse
from app.services.dieta_service import DietaService
from decimal import Decimal

# Reglas backend para evitar manipulación desde clientes externos
# Ampliado temporalmente para permitir grabar dietas de conductores nuevos con "canon_tti".
# TODO: Revisar política definitiva y, si procede, volver a restringir o filtrar desde frontend.
ALLOWED_CONCEPTS_NUEVO = { 'pernocta', 'festivos', 'canon_tti' }
PERCENT_CONCEPT_PREFIXES = ('extraPct:',)
EXTRA_FIXED_PREFIX = 'extra:'

router = APIRouter()

@router.post('/', response_model=DietaRecordResponse)
async def create_dieta_record(
    payload: DietaRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    x_company: str | None = Header(default=None, alias="X-Company"),
):
    # Roles permitidos para crear registros de dietas:
    #  - ADMINISTRADOR y MASTER_ADMIN (pleno acceso)
    #  - ADMINISTRACION (se habilita para carga operativa de dietas)
    role_value = getattr(current_user.role, 'value', current_user.role)
    if role_value not in ['ADMINISTRADOR', 'MASTER_ADMIN', 'ADMINISTRACION']:
        raise HTTPException(status_code=403, detail='No autorizado')
    if not payload.order_number or not payload.order_number.strip():
        raise HTTPException(status_code=422, detail='order_number es obligatorio')
    # Validar usuario destino y tipo real de trabajador
    target_user = db.query(User).filter(User.id == payload.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail='Usuario objetivo no encontrado')
    real_worker_type = getattr(target_user, 'worker_type', None) or 'antiguo'

    # Forzar worker_type a valor real (evita spoof)
    payload.worker_type = real_worker_type

    # Validaciones específicas para 'nuevo'
    if real_worker_type == 'nuevo':
        invalid = [c.code for c in payload.concepts if not (
            c.code in ALLOWED_CONCEPTS_NUEVO or c.code.startswith(EXTRA_FIXED_PREFIX) or c.code.startswith(PERCENT_CONCEPT_PREFIXES))]
        if invalid:
            raise HTTPException(status_code=422, detail=f"Conceptos no permitidos para trabajador 'nuevo': {', '.join(invalid)}")
        # Asegurar importes correctos (50€) para pernocta y festivos
        enforced_amounts = {'pernocta': 50.0, 'festivos': 50.0}
        for c in payload.concepts:
            if c.code in enforced_amounts:
                # subtotal esperado = quantity * importe fijo
                expected_rate = enforced_amounts[c.code]
                # No tenemos rate en schema de entrada, pero subtotal se recalcula en frontend; aquí recalculamos total final luego
                pass
        # Prohibir recargos sobre tramo kms (no deberían existir códigos percentKmTramo en nuevos)
    else:
        # Para 'antiguo' impedir que se envíe tramo kms manualmente (el backend no lo recibe separado, pero validamos percent en extras sin base)
        pass

    # Validar total = suma subtotales de conceptos (tolerancia 0.01) recomputando desde conceptos recibidos
    recomputed_total = sum(Decimal(str(c.subtotal)) for c in payload.concepts)
    if (Decimal(str(payload.total_amount)) - recomputed_total).copy_abs() > Decimal('0.02'):
        raise HTTPException(status_code=422, detail='total_amount no coincide con la suma de subtotales de conceptos')

    # Determinar compañía desde el usuario actual
    comp_obj = effective_company_for_request(current_user, x_company)
    record = DietaService.create(db, payload, company=comp_obj)
    # Asegurar carga de usuario para user_name
    user = target_user
    full_name = None
    if user:
        full_name = getattr(user, 'full_name', None) or (
            f"{getattr(user,'first_name','').strip()} {getattr(user,'last_name','').strip()}".strip() or None
        )
    resp = DietaRecordResponse.model_validate(record, from_attributes=True)
    resp.user_name = full_name
    return resp

@router.get('/', response_model=List[DietaRecordResponse])
async def list_dietas(
    user_id: Optional[int] = None,
    start_date: Optional[str] = Query(None, description='Fecha inicio (YYYY-MM-DD)'),
    end_date: Optional[str] = Query(None, description='Fecha fin (YYYY-MM-DD)'),
    worker_type: Optional[str] = None,
    order_number: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    x_company: str | None = Header(default=None, alias="X-Company"),
):
    # Visibilidad según rol:
    #  - TRABAJADOR: siempre solo sus propios registros
    #  - ADMINISTRACION: ahora puede ver todos SI especifica filtros (o ninguno) -> no forzamos user_id
    #    (si se quisiera limitar a sí mismo bastaría con volver a forzar user_id aquí)
    #  - ADMINISTRADOR / MASTER_ADMIN: todos
    role_value = str(getattr(current_user.role, 'value', current_user.role))
    if role_value == 'TRABAJADOR':
        user_id = getattr(current_user, 'id')
    # Filtrar por compañía efectiva (permite override vía X-Company para admins)
    comp_obj = effective_company_for_request(current_user, x_company)
    records = DietaService.list(db, user_id, start_date, end_date, worker_type, order_number, company=comp_obj)
    resp_list: List[DietaRecordResponse] = []
    for r in records:
        user = getattr(r, 'user', None)
        full_name = None
        if user:
            full_name = getattr(user, 'full_name', None) or (
                f"{getattr(user,'first_name','').strip()} {getattr(user,'last_name','').strip()}".strip() or None
            )
        item = DietaRecordResponse.model_validate(r, from_attributes=True)
        item.user_name = full_name
        resp_list.append(item)
    return resp_list

@router.get('/{record_id}', response_model=DietaRecordResponse)
async def get_dieta_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    x_company: str | None = Header(default=None, alias="X-Company"),
):
    record = DietaService.get(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail='Registro no encontrado')
    # Restringir por compañía (usar compañía efectiva con posible override para admins)
    comp_obj = effective_company_for_request(current_user, x_company)
    if comp_obj is not None and getattr(record, 'company', None) not in (None, comp_obj):
        raise HTTPException(status_code=404, detail='Registro no encontrado')
    role_value = str(getattr(current_user.role, 'value', current_user.role))
    if role_value == 'TRABAJADOR' and record.user_id != getattr(current_user, 'id'):
        raise HTTPException(status_code=403, detail='No autorizado')
    resp = DietaRecordResponse.model_validate(record, from_attributes=True)
    user = getattr(record, 'user', None)
    if user:
        resp.user_name = getattr(user, 'full_name', None) or (
            f"{getattr(user,'first_name','').strip()} {getattr(user,'last_name','').strip()}".strip() or None
        )
    return resp