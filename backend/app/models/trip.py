from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base

class TripRecord(Base):
    """Registro de viaje con pernocta / festivo / Canon TTI.
    Guarda el número de albarán/OC asociado, indicadores de pernocta, festivo y Canon TTI, fecha del evento y nota.
    """
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True, comment="ID del trabajador")
    order_number = Column(String(100), nullable=False, index=True, comment="Albarán / OC")
    pernocta = Column(Boolean, nullable=False, default=False)
    festivo = Column(Boolean, nullable=False, default=False)
    canon_tti = Column(Boolean, nullable=False, default=False, comment="Canon TTI")
    event_date = Column(Date, nullable=False, comment="Fecha del viaje / pernocta / festivo")
    note = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User")

    @property
    def user_name(self):
        u = getattr(self, 'user', None)
        if not u:
            return None
        return getattr(u, 'full_name', None) or f"{getattr(u,'first_name','').strip()} {getattr(u,'last_name','').strip()}".strip() or None

    def __repr__(self):
        return f"<TripRecord id={self.id} user_id={self.user_id} order={self.order_number} date={self.event_date}>"
