from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import List, Optional
from app.models.distanciero import Distanciero
from app.models.schemas import DistancieroCreate, DistancieroUpdate


def normalize_destination(destination: str) -> str:
    return ' '.join(destination.strip().lower().split())


class DistancieroService:
    @staticmethod
    def list_grouped(db: Session, active: Optional[bool] = None):
        q = db.query(
            Distanciero.client_name.label('client_name'),
            func.count(Distanciero.id).label('total_routes'),
            func.sum(
                case((Distanciero.active == True, 1), else_=0)
            ).label('active_routes'),
            func.min(Distanciero.km).label('min_km'),
            func.max(Distanciero.km).label('max_km'),
        )
        if active is not None:
            q = q.filter(Distanciero.active == active)
        return q.group_by(Distanciero.client_name).order_by(Distanciero.client_name.asc()).all()

    @staticmethod
    def list_routes(db: Session, client_name: str, only_active: bool | None = None,
                    q_text: str | None = None, limit: int = 200, offset: int = 0):
        base = db.query(Distanciero).filter(Distanciero.client_name == client_name)
        if only_active is True:
            base = base.filter(Distanciero.active == True)
        if q_text:
            norm = normalize_destination(q_text)
            like = f"%{norm}%"
            base = base.filter(Distanciero.destination_normalized.like(like))
        total = base.count()
        items = (base
                 .order_by(Distanciero.destination.asc())
                 .limit(max(1, min(1000, limit)))
                 .offset(max(0, offset))
                 .all())
        return { 'total': total, 'items': items }

    @staticmethod
    def create(db: Session, data: DistancieroCreate) -> Distanciero:
        dest_norm = normalize_destination(data.destination)
        entity = Distanciero(
            client_name=data.client_name.strip(),
            destination=data.destination.strip(),
            destination_normalized=dest_norm,
            km=data.km,
            active=data.active,
            notes=data.notes
        )
        db.add(entity)
        db.commit()
        db.refresh(entity)
        return entity

    @staticmethod
    def update(db: Session, dist_id: int, data: DistancieroUpdate) -> Distanciero | None:
        entity = db.query(Distanciero).filter(Distanciero.id == dist_id).first()
        if not entity:
            return None
        if data.client_name is not None:
            entity.client_name = data.client_name.strip()  # type: ignore[attr-defined]
        if data.destination is not None:
            entity.destination = data.destination.strip()  # type: ignore[attr-defined]
            entity.destination_normalized = normalize_destination(data.destination)  # type: ignore[attr-defined]
        if data.km is not None:
            entity.km = data.km  # type: ignore[attr-defined]
        if data.active is not None:
            entity.active = data.active  # type: ignore[attr-defined]
        if data.notes is not None:
            entity.notes = data.notes  # type: ignore[attr-defined]
        db.commit()
        db.refresh(entity)
        return entity

    @staticmethod
    def delete(db: Session, dist_id: int) -> bool:
        entity = db.query(Distanciero).filter(Distanciero.id == dist_id).first()
        if not entity:
            return False
        db.delete(entity)
        db.commit()
        return True