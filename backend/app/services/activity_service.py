from sqlalchemy.orm import Session
from app.models.activity_log import ActivityLog

class ActivityService:
    """Servicio para registrar eventos en activity_log."""

    @staticmethod
    def log(db: Session, user_name: str, action: str, type_: str = "update"):
        entry = ActivityLog(user_name=user_name, action=action, type=type_)
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry
