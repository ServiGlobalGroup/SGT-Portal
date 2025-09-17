from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, Tuple, List
from datetime import date
from app.models.resources import FuelCard, ViaTDevice


class ResourcesService:
    # Fuel Cards
    @staticmethod
    def create_fuel_card(db: Session, pan: str, matricula: str, caducidad: Optional[date], pin: str, user_id: Optional[int]) -> FuelCard:
        card = FuelCard(pan=pan, matricula=matricula, caducidad=caducidad, pin=pin, created_by=user_id)
        db.add(card)
        db.commit()
        db.refresh(card)
        return card

    @staticmethod
    def list_fuel_cards(db: Session, pan: Optional[str], matricula: Optional[str], page: int, page_size: int) -> Tuple[int, List[FuelCard]]:
        q = db.query(FuelCard)
        if pan:
            q = q.filter(FuelCard.pan.ilike(f"%{pan}%"))
        if matricula:
            q = q.filter(FuelCard.matricula.ilike(f"%{matricula}%"))
        total = q.count()
        items = (q.order_by(FuelCard.id.desc())
                   .offset((page-1)*page_size)
                   .limit(page_size)
                   .all())
        return total, items

    # Via T Devices
    @staticmethod
    def create_viat(db: Session, numero_telepeaje: str, pan: str, matricula: str, caducidad: Optional[date], user_id: Optional[int]) -> ViaTDevice:
        device = ViaTDevice(numero_telepeaje=numero_telepeaje, pan=pan, matricula=matricula, caducidad=caducidad, created_by=user_id)
        db.add(device)
        db.commit()
        db.refresh(device)
        return device

    @staticmethod
    def list_viat(db: Session, numero_telepeaje: Optional[str], pan: Optional[str], matricula: Optional[str], page: int, page_size: int) -> Tuple[int, List[ViaTDevice]]:
        q = db.query(ViaTDevice)
        if numero_telepeaje:
            q = q.filter(ViaTDevice.numero_telepeaje.ilike(f"%{numero_telepeaje}%"))
        if pan:
            q = q.filter(ViaTDevice.pan.ilike(f"%{pan}%"))
        if matricula:
            q = q.filter(ViaTDevice.matricula.ilike(f"%{matricula}%"))
        total = q.count()
        items = (q.order_by(ViaTDevice.id.desc())
                   .offset((page-1)*page_size)
                   .limit(page_size)
                   .all())
        return total, items
