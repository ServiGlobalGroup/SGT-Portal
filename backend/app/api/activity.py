from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from app.database.connection import get_db
from app.models.activity_log import ActivityLog
from app.api.auth import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/recent")
def get_recent_activity(
    limit: int = Query(20, ge=1, le=100, description="Número máximo de items"),
    offset: int = Query(0, ge=0, description="Offset para paginación"),
    event_type: str | None = Query(None, description="Filtrar por tipo de evento (enum)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Devuelve actividad reciente (admins ven todo, usuarios solo propios)."""
    query = db.query(ActivityLog)

    # Filtrar logs del master admin (usuario oculto no debe aparecer en actividad)
    query = query.filter(ActivityLog.actor_id != -1)  # El master admin tiene ID -1
    query = query.filter(ActivityLog.actor_dni.notlike('%ADMIN%'))  # Filtrar usuarios admin ocultos

    # Permisos: sólo ADMINISTRADOR / MASTER_ADMIN ven todo
    role_value = getattr(current_user.role, "value", None)
    if role_value not in ["ADMINISTRADOR", "MASTER_ADMIN"]:
        # Filtrar a eventos donde actor_id es el usuario actual o actor_dni coincide
        query = query.filter((ActivityLog.actor_id == current_user.id) | (ActivityLog.actor_dni == current_user.dni_nie))

    if event_type:
        query = query.filter(ActivityLog.event_type == event_type)

    total = query.count()
    rows: List[ActivityLog] = (
        query.order_by(desc(ActivityLog.created_at)).offset(offset).limit(limit).all()
    )
    items = [row.to_activity_item() for row in rows]
    return {"items": items, "total": total, "limit": limit, "offset": offset}
