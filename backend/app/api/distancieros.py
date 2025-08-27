from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.connection import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.schemas import DistancieroResponse, DistancieroCreate, DistancieroUpdate, DistancieroGrouped
from app.services.distanciero_service import DistancieroService, normalize_destination
from pydantic import BaseModel


class GoogleRouteCreate(BaseModel):
    origin: str
    destination: str
    mode: str = 'DRIVING'
    km: float
    duration_sec: int | None = None
    polyline: str | None = None
    variant: str = 'NOTOLLS'  # NOTOLLS | TOLLS

class GoogleRouteResponse(BaseModel):
    origin: str
    destination: str
    mode: str
    km: float
    duration_sec: int | None
    polyline: str | None
    cached: bool = True
    variant: str = 'NOTOLLS'

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
    result = []
    for r in rows:
        try:
            result.append(DistancieroGrouped(
                client_name=r.client_name,
                total_routes=r.total_routes,
                active_routes=r.active_routes or 0,
                min_km=float(r.min_km) if r.min_km is not None else None,
                max_km=float(r.max_km) if r.max_km is not None else None
            ))
        except Exception:
            # fallback defensivo
            result.append(DistancieroGrouped(
                client_name=str(getattr(r,'client_name','?')),
                total_routes=int(getattr(r,'total_routes',0)),
                active_routes=int(getattr(r,'active_routes',0) or 0),
                min_km=None,
                max_km=None
            ))
    return result


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


@router.get('/google/route', response_model=GoogleRouteResponse)
async def get_google_cached_route(
    origin: str,
    destination: str,
    mode: str = 'DRIVING',
    variant: str = 'NOTOLLS',
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role_value = getattr(current_user.role, 'value', current_user.role)
    if role_value not in ['ADMINISTRADOR', 'MASTER_ADMIN', 'TRAFICO', 'TRABAJADOR']:
        raise HTTPException(status_code=403, detail='No autorizado')
    entity = DistancieroService.get_cached_route(db, origin, destination, mode, variant=variant)
    if not entity:
        raise HTTPException(status_code=404, detail='No caché')
    return GoogleRouteResponse(  # type: ignore[arg-type]
        origin=getattr(entity, 'origin', None) or origin,
        destination=getattr(entity, 'destination'),
        mode=getattr(entity, 'mode', None) or mode,
        km=getattr(entity, 'km'),
        duration_sec=getattr(entity, 'duration_sec'),
        polyline=getattr(entity, 'polyline'),
        cached=True,
        variant=variant.upper()
    )


@router.post('/google/route', response_model=GoogleRouteResponse)
async def save_google_route(
    payload: GoogleRouteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role_value = getattr(current_user.role, 'value', current_user.role)
    # Permitir a todos los roles autenticados para maximizar reutilización (ajustar si necesario)
    if role_value not in ['ADMINISTRADOR', 'MASTER_ADMIN', 'TRAFICO', 'TRABAJADOR']:
        raise HTTPException(status_code=403, detail='No autorizado')
    entity = DistancieroService.save_google_route(
        db,
        origin=payload.origin,
        destination=payload.destination,
        mode=payload.mode,
        km=payload.km,
        duration_sec=payload.duration_sec,
        polyline=payload.polyline,
        variant=payload.variant
    )
    return GoogleRouteResponse(  # type: ignore[arg-type]
        origin=getattr(entity, 'origin', None) or payload.origin,
        destination=getattr(entity, 'destination'),
        mode=getattr(entity, 'mode', None) or payload.mode,
        km=getattr(entity, 'km'),
        duration_sec=getattr(entity, 'duration_sec'),
        polyline=getattr(entity, 'polyline'),
        cached=True,
        variant=payload.variant.upper()
    )