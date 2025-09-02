from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_  # para filtros de texto
from datetime import date

from app.database.connection import get_db  # fixed
from app.models.trip import TripRecord
from app.models.user import User, UserRole
from app.schemas.trips import TripCreate, TripOut, TripPage
from app.api.auth import get_current_user  # fixed

router = APIRouter(prefix="/api/trips", tags=["trips"])  # harmonize with other routes

# Roles que pueden gestionar (crear / borrar) y roles que pueden ver todos
MANAGE_ROLES = {UserRole.ADMINISTRADOR, UserRole.MASTER_ADMIN}
VIEW_ALL_ROLES = {UserRole.ADMINISTRADOR, UserRole.MASTER_ADMIN}

@router.post("/", response_model=TripOut, status_code=status.HTTP_201_CREATED)
async def create_trip(payload: TripCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Crear un registro de viaje.
    Cualquier usuario autenticado puede crear su propio registro (conductores).
    Eliminamos restricción para permitir a TRABAJADOR usar el formulario.
    """
    trip = TripRecord(
        user_id=current_user.id,
        order_number=payload.order_number,
        pernocta=payload.pernocta,
        festivo=payload.festivo,
        event_date=payload.event_date,
        note=payload.note,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip

@router.get("/", response_model=TripPage)
async def list_trips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    user_id: Optional[int] = Query(None),
    start: Optional[date] = Query(None),
    end: Optional[date] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200)
):
    # Base query
    if current_user.role not in VIEW_ALL_ROLES:
        q = db.query(TripRecord).filter(TripRecord.user_id == current_user.id)
    else:
        q = db.query(TripRecord)
        if user_id:
            q = q.filter(TripRecord.user_id == user_id)
    if start:
        q = q.filter(TripRecord.event_date >= start)
    if end:
        q = q.filter(TripRecord.event_date <= end)

    total = q.count()
    items = (q.order_by(TripRecord.event_date.desc(), TripRecord.id.desc())
               .offset((page-1)*page_size)
               .limit(page_size)
               .all())
    # Convertir a modelos Pydantic (TripOut) para tipado estricto
    trip_out_items = [TripOut.model_validate(i) for i in items]
    return TripPage(total=total, page=page, page_size=page_size, items=trip_out_items)

@router.get("/mine", response_model=List[TripOut])
async def my_trips(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(TripRecord).filter(TripRecord.user_id == current_user.id)
    return q.order_by(TripRecord.event_date.desc(), TripRecord.id.desc()).all()

@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(status_code=403, detail="Permiso denegado")
    trip = db.query(TripRecord).get(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    db.delete(trip)
    db.commit()
    return None

@router.get("/user-suggestions")
async def user_suggestions(q: str = Query(..., min_length=2), limit: int = Query(10, ge=1, le=50), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Devuelve sugerencias básicas de usuarios (id, nombre, rol) para el autocomplete.
    Restringido a ADMINISTRADOR / MASTER_ADMIN.
    """
    if current_user.role not in VIEW_ALL_ROLES:
        return []
    pattern = f"%{q.lower()}%"
    rows = (db.query(User)
              .filter(User.is_active == True)  # noqa: E712
              .filter(or_(User.first_name.ilike(pattern), User.last_name.ilike(pattern), (User.first_name + ' ' + User.last_name).ilike(pattern), User.dni_nie.ilike(pattern)))
              .order_by(User.first_name.asc())
              .limit(limit)
              .all())
    return [{ 'id': u.id, 'label': f"{u.first_name} {u.last_name}".strip(), 'role': u.role.name } for u in rows]
