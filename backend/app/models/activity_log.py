from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.sql import func
from app.database.connection import Base

class ActivityLog(Base):
    """Modelo ORM alineado con la tabla activity_log real del DDL.

    Columnas:
      id, created_at, event_type, actor_id, actor_dni, actor_name,
      entity_type, entity_id, message, meta
    """
    __tablename__ = "activity_log"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    event_type = Column(String(50), nullable=False)
    actor_id = Column(Integer, nullable=True)
    actor_dni = Column(String(20), nullable=True)
    actor_name = Column(String(200), nullable=True)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(String(50), nullable=True)
    message = Column(String(255), nullable=False)
    meta = Column(JSON, nullable=True)

    def to_activity_item(self):
        """Convierte el registro al formato esperado por el frontend RecentActivity."""
        # Mapear event_type (del enum real) a los tipos usados por el frontend
        mapping = {
            "FILE_UPLOAD": "upload",
            "UPLOAD_HISTORY": "upload",
            "VACATION_STATUS_UPDATED": "approval",
            "LOGIN": "login",
            # Otros eventos los tratamos como 'update'
        }
        event_type_val = getattr(self, "event_type", None)
        if not isinstance(event_type_val, str):
            event_type_val = "OTHER"
        type_mapped = mapping.get(event_type_val, "update")
        created_at_val = getattr(self, "created_at", None)
        return {
            "id": getattr(self, "id", None),
            "user_name": getattr(self, "actor_name", None) or getattr(self, "actor_dni", None) or "Usuario",
            "action": getattr(self, "message", ""),
            "type": type_mapped,
            "timestamp": created_at_val.isoformat() if created_at_val else None,
        }
