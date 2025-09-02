from sqlalchemy import Column, Integer, String, Date, DateTime, Numeric, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base

class DietaRecord(Base):
    """Registro de cálculo de dietas guardado.
    Un registro agrupa los conceptos seleccionados para un conductor en un mes concreto y una OC/Albarán.
    """
    __tablename__ = "dietas"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True, comment="ID del trabajador")
    worker_type = Column(String(10), nullable=False, comment="Tipo trabajador en el momento del cálculo")
    order_number = Column(String(100), nullable=True, comment="OC / Albarán asociado")
    # Ahora almacena fecha completa AAAA-MM-DD (se mantiene nombre 'month' por compatibilidad)
    month = Column(String(10), nullable=False, comment="Fecha AAAA-MM-DD del registro (antes mes AAAA-MM)")
    total_amount = Column(Numeric(10,2), nullable=False, comment="Importe total calculado")
    concepts = Column(JSON, nullable=False, comment="Lista de conceptos (cantidad puede ser decimal p.ej. 0.5) con importes")
    notes = Column(String(500), nullable=True, comment="Notas adicionales")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User")

    @property
    def user_name(self):
        """Nombre completo derivado del usuario relacionado.
        Se usa en las respuestas para no depender de lógica adicional en la API.
        """
        try:
            u = getattr(self, 'user', None)
            if not u:
                return None
            # full_name property ya existe en User
            return getattr(u, 'full_name', None) or f"{getattr(u,'first_name','').strip()} {getattr(u,'last_name','').strip()}".strip() or None
        except Exception:
            return None

    def __repr__(self):
        return f"<DietaRecord id={self.id} user_id={self.user_id} month={self.month} total={self.total_amount}>"