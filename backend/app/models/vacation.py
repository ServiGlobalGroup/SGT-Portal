from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base
import enum
from datetime import datetime

class VacationStatus(enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED" 
    REJECTED = "REJECTED"

class VacationRequest(Base):
    """
    Modelo de solicitudes de vacaciones.
    Relacionado con la tabla de usuarios.
    """
    __tablename__ = "vacation_requests"
    
    # Identificador
    id = Column(Integer, primary_key=True, index=True)
    
    # Relación con usuario
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True, comment="ID del usuario que solicita")
    
    # Fechas de vacaciones
    start_date = Column(DateTime, nullable=False, comment="Fecha de inicio de vacaciones")
    end_date = Column(DateTime, nullable=False, comment="Fecha de fin de vacaciones")
    
    # Información de la solicitud
    reason = Column(Text, nullable=False, comment="Motivo o descripción de la solicitud")
    status = Column(Enum(VacationStatus), nullable=False, default=VacationStatus.PENDING, comment="Estado de la solicitud")
    
    # Respuesta del administrador
    admin_response = Column(Text, nullable=True, comment="Comentario del administrador al aprobar/rechazar")
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True, comment="ID del administrador que revisó")
    reviewed_at = Column(DateTime, nullable=True, comment="Fecha de revisión por parte del admin")
    
    # Metadatos
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="Fecha de creación")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), comment="Fecha de última actualización")
    
    # Relaciones
    user = relationship("User", foreign_keys=[user_id], back_populates="vacation_requests")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    
    def __repr__(self):
        return f"<VacationRequest(id={self.id}, user_id={self.user_id}, status='{self.status.value}')>"
    
    @property
    def duration_days(self) -> int:
        """Calcula la duración en días de la solicitud de vacaciones"""
        if self.start_date and self.end_date:
            delta = self.end_date - self.start_date
            return delta.days + 1  # +1 para incluir el día de inicio
        return 0
    
    @property
    def is_current(self) -> bool:
        """Verifica si las vacaciones están en curso actualmente"""
        now = datetime.now()
        return (self.status == VacationStatus.APPROVED and 
                self.start_date <= now <= self.end_date)
    
    @property
    def is_future(self) -> bool:
        """Verifica si las vacaciones son futuras"""
        now = datetime.now()
        return self.start_date > now
    
    @property
    def is_past(self) -> bool:
        """Verifica si las vacaciones ya han pasado"""
        now = datetime.now()
        return self.end_date < now
