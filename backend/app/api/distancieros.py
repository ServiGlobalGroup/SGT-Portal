from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.connection import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.schemas import DistancieroResponse, DistancieroCreate, DistancieroUpdate, DistancieroGrouped
from app.services.distanciero_service import DistancieroService

router = APIRouter()


@router.get('/grouped', response_model=List[DistancieroGrouped])
async def list_grouped_distancieros(
    active: Optional[bool] = Query(None, description="Filtrar por activos"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Permitir mismos roles que dietas (admin / master). Ajustar si se desea abrir más.
    role_value = getattr(current_user.role, 'value', current_user.role)
    # Lectura abierta a todos los roles autenticados (incluye TRABAJADOR)
    if role_value not in ['ADMINISTRADOR', 'MASTER_ADMIN', 'TRAFICO', 'TRABAJADOR']:
        raise HTTPException(status_code=403, detail='No autorizado')
    rows = DistancieroService.list_grouped(db, active)
    return [DistancieroGrouped(
        client_name=r.client_name,
        total_routes=r.total_routes,
        active_routes=r.active_routes or 0,
        min_km=r.min_km,
        max_km=r.max_km
    ) for r in rows]


@router.get('/{client_name}/routes')
async def list_routes(
    client_name: str,
    only_active: Optional[bool] = Query(None, description="Solo activos"),
    q: Optional[str] = Query(None, description="Buscar destino contiene"),
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role_value = getattr(current_user.role, 'value', current_user.role)
    if role_value not in ['ADMINISTRADOR', 'MASTER_ADMIN', 'TRAFICO', 'TRABAJADOR']:
        raise HTTPException(status_code=403, detail='No autorizado')
    data = DistancieroService.list_routes(db, client_name, only_active, q_text=q, limit=limit, offset=offset)
    return {
        'total': data['total'],
        'items': [DistancieroResponse.model_validate(r, from_attributes=True) for r in data['items']],
        'limit': limit,
        'offset': offset
    }


@router.post('/', response_model=DistancieroResponse)
async def create_distanciero(
    payload: DistancieroCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role_value = getattr(current_user.role, 'value', current_user.role)
    if role_value not in ['ADMINISTRADOR', 'MASTER_ADMIN']:
        raise HTTPException(status_code=403, detail='No autorizado')
    entity = DistancieroService.create(db, payload)
    return DistancieroResponse.model_validate(entity, from_attributes=True)


@router.put('/{dist_id}', response_model=DistancieroResponse)
async def update_distanciero(
    dist_id: int,
    payload: DistancieroUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role_value = getattr(current_user.role, 'value', current_user.role)
    if role_value not in ['ADMINISTRADOR', 'MASTER_ADMIN']:
        raise HTTPException(status_code=403, detail='No autorizado')
    entity = DistancieroService.update(db, dist_id, payload)
    if not entity:
        raise HTTPException(status_code=404, detail='No encontrado')
    return DistancieroResponse.model_validate(entity, from_attributes=True)


@router.delete('/{dist_id}')
async def delete_distanciero(
    dist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role_value = getattr(current_user.role, 'value', current_user.role)
    if role_value not in ['ADMINISTRADOR', 'MASTER_ADMIN']:
        raise HTTPException(status_code=403, detail='No autorizado')
    ok = DistancieroService.delete(db, dist_id)  # type: ignore[attr-defined]
    if not ok:
        raise HTTPException(status_code=404, detail='No encontrado')
    return {"status": "deleted"}