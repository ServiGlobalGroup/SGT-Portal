from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.models.dieta import DietaRecord
from app.models.user import User
from app.models.schemas import DietaRecordCreate

class DietaService:
    @staticmethod
    def create(db: Session, data: DietaRecordCreate) -> DietaRecord:
        record = DietaRecord(
            user_id=data.user_id,
            worker_type=data.worker_type,
            order_number=data.order_number,
            month=data.month,
            total_amount=data.total_amount,
            concepts=[c.dict() for c in data.concepts],  # quantity ahora float
            notes=data.notes,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def get(db: Session, record_id: int) -> Optional[DietaRecord]:
        return db.query(DietaRecord).options(joinedload(DietaRecord.user)).filter(DietaRecord.id == record_id).first()

    @staticmethod
    def list(
        db: Session,
        user_id: Optional[int] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        worker_type: Optional[str] = None,
        order_number: Optional[str] = None,
    ) -> List[DietaRecord]:
        q = db.query(DietaRecord).options(joinedload(DietaRecord.user))
        if user_id:
            q = q.filter(DietaRecord.user_id == user_id)
        if worker_type:
            q = q.filter(DietaRecord.worker_type == worker_type)
        if order_number:
            q = q.filter(DietaRecord.order_number.ilike(f"%{order_number}%"))
        if start_date:
            q = q.filter(DietaRecord.month >= start_date)  # ahora YYYY-MM-DD
        if end_date:
            q = q.filter(DietaRecord.month <= end_date)
        return q.order_by(DietaRecord.created_at.desc()).all()