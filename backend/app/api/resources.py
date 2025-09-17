from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from app.database.connection import get_db
from app.api.auth import get_current_user
from app.models.user import User, UserRole
from app.schemas.resources import (
    FuelCardCreate, FuelCardOut, FuelCardPage,
    ViaTDeviceCreate, ViaTDeviceOut, ViaTDevicePage
)
from app.services.resources_service import ResourcesService

router = APIRouter(prefix="/api/resources", tags=["resources"])  # agrupado

CREATE_ROLES = {UserRole.MASTER_ADMIN, UserRole.ADMINISTRADOR, UserRole.ADMINISTRACION}


@router.post("/fuel-cards", response_model=FuelCardOut, status_code=status.HTTP_201_CREATED)
def create_fuel_card(payload: FuelCardCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in CREATE_ROLES:
        raise HTTPException(status_code=403, detail="Permiso denegado")
    card = ResourcesService.create_fuel_card(
        db, 
        pan=payload.pan, 
        matricula=payload.matricula, 
        caducidad=payload.caducidad, 
        pin=payload.pin, 
        user_id=int(getattr(current_user, 'id')) if getattr(current_user, 'id', None) is not None else None
    )
    return FuelCardOut.from_orm_with_mask(card)


@router.get("/fuel-cards", response_model=FuelCardPage)
def list_fuel_cards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    pan: Optional[str] = Query(None),
    matricula: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200)
):
    total, items = ResourcesService.list_fuel_cards(db, pan=pan, matricula=matricula, page=page, page_size=page_size)
    items_out = [FuelCardOut.from_orm_with_mask(i) for i in items]
    return FuelCardPage(total=total, page=page, page_size=page_size, items=items_out)


@router.post("/via-t-devices", response_model=ViaTDeviceOut, status_code=status.HTTP_201_CREATED)
def create_via_t(payload: ViaTDeviceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in CREATE_ROLES:
        raise HTTPException(status_code=403, detail="Permiso denegado")
    device = ResourcesService.create_viat(db, numero_telepeaje=payload.numero_telepeaje, pan=payload.pan, matricula=payload.matricula, caducidad=payload.caducidad, user_id=int(getattr(current_user, 'id')) if getattr(current_user, 'id', None) is not None else None)
    return ViaTDeviceOut.model_validate(device)


@router.get("/via-t-devices", response_model=ViaTDevicePage)
def list_via_t(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    numero_telepeaje: Optional[str] = Query(None),
    pan: Optional[str] = Query(None),
    matricula: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200)
):
    total, items = ResourcesService.list_viat(db, numero_telepeaje=numero_telepeaje, pan=pan, matricula=matricula, page=page, page_size=page_size)
    items_out = [ViaTDeviceOut.model_validate(i) for i in items]
    return ViaTDevicePage(total=total, page=page, page_size=page_size, items=items_out)
