from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import List, Optional
import hashlib
from app.models.distanciero import Distanciero
from app.models.schemas import DistancieroCreate, DistancieroUpdate


def normalize_destination(destination: str) -> str:
    return ' '.join(destination.strip().lower().split())


class DistancieroService:
    @staticmethod
    def build_route_hash(origin_norm: str, dest_norm: str, mode: str) -> str:
        base = f"{origin_norm}|{dest_norm}|{mode.upper()}"
        # Hash corto para asegurar longitud consistente (pero guardamos también clave en claro si quieres)
        h = hashlib.sha1(base.encode('utf-8')).hexdigest()[:16]
        return f"{base}|{h}"

    @staticmethod
    def get_cached_route(db: Session, origin: str, destination: str, mode: str = 'DRIVING', variant: str = 'NOTOLLS', waypoints: list[str] | None = None) -> Distanciero | None:
        o_norm = normalize_destination(origin)
        d_norm = normalize_destination(destination)
        wp_norms: list[str] = []
        if waypoints:
            wp_norms = [normalize_destination(w) for w in waypoints if w and w.strip()]
        if wp_norms:
            chain_norm = '|'.join([o_norm, *wp_norms, d_norm])
            base_str = f"{chain_norm}|{mode.upper()}"
            h = hashlib.sha1(base_str.encode('utf-8')).hexdigest()[:16]
            base_key = f"{base_str}|{h}"
        else:
            base_key = DistancieroService.build_route_hash(o_norm, d_norm, mode)
        hash_key = base_key if variant.upper()=='NOTOLLS' else base_key + '|T'
        return (db.query(Distanciero)
                .filter(
                    Distanciero.client_name == 'GOOGLE MAPS',
                    Distanciero.hash_key == hash_key
                ).first())

    @staticmethod
    def save_google_route(db: Session, origin: str, destination: str, mode: str, km: float,
                          duration_sec: int | None, polyline: str | None, variant: str = 'NOTOLLS', uses_tolls: bool | None = None,
                          waypoints: list[str] | None = None) -> Distanciero:
        """Guardar ruta Google (simple o multi-tramo rápida) reusando columnas existentes.
        Si hay waypoints, se codifica la cadena en destination y hash.
        """
        waypoints = waypoints or []
        o_norm = normalize_destination(origin)
        d_norm = normalize_destination(destination)
        wp_norms = [normalize_destination(w) for w in waypoints if w.strip()]

        if wp_norms:
            # Multi-tramo: incluir todos los puntos en hash base
            chain_norm = '|'.join([o_norm, *wp_norms, d_norm])
            base_str = f"{chain_norm}|{mode.upper()}"
            import hashlib
            h = hashlib.sha1(base_str.encode('utf-8')).hexdigest()[:16]
            base_key = f"{base_str}|{h}"
            # Destination mostrado: ORIGEN > W1 > W2 > DEST (sin recorte inicial para claridad)
            formatted_destination = ' > '.join([origin.strip(), *[w.strip() for w in waypoints if w.strip()], destination.strip()])
            destination_normalized = chain_norm  # búsqueda futura
        else:
            # Ruta simple (comportamiento previo)
            base_key = DistancieroService.build_route_hash(o_norm, d_norm, mode)
            formatted_destination = f"{origin.strip()}-{destination.strip()}"
            destination_normalized = d_norm

        hash_key = base_key if variant.upper()=='NOTOLLS' else base_key + '|T'
        if variant.upper() == 'TOLLS':
            destination_normalized = destination_normalized + '|tolls'

        entity = (db.query(Distanciero)
                    .filter(Distanciero.hash_key == hash_key)
                    .first())
        if entity:
            # Update existente
            entity.km = km  # type: ignore[attr-defined]
            entity.duration_sec = duration_sec  # type: ignore[attr-defined]
            entity.polyline = polyline  # type: ignore[attr-defined]
            entity.uses_tolls = uses_tolls  # type: ignore[attr-defined]
            entity.destination = formatted_destination  # type: ignore[attr-defined]
            entity.destination_normalized = destination_normalized  # type: ignore[attr-defined]
            db.commit()
            db.refresh(entity)
            return entity

        entity = Distanciero(
            client_name='GOOGLE MAPS',
            destination=formatted_destination,
            destination_normalized=destination_normalized,
            km=km,
            active=True,
            notes=None,
            origin=origin.strip(),
            origin_normalized=o_norm,
            mode=mode.upper(),
            duration_sec=duration_sec,
            polyline=polyline,
            hash_key=hash_key,
            uses_tolls=uses_tolls
        )
        db.add(entity)
        db.commit()
        db.refresh(entity)
        return entity
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