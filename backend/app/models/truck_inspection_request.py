"""Modelo para solicitudes manuales de inspecciones de camiones."""
from __future__ import annotations

import enum
from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, Enum, func
from sqlalchemy.orm import relationship

from app.database.connection import Base
from app.models.company_enum import Company


class InspectionRequestStatus(enum.Enum):
    """Estados de una solicitud manual de inspección."""

    PENDING = "PENDING"
    COMPLETED = "COMPLETED"


class TruckInspectionRequest(Base):
    """Solicitud manual para que un trabajador realice una inspección de camión."""

    __tablename__ = "truck_inspection_requests"

    id = Column(Integer, primary_key=True, index=True)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    company = Column(Enum(Company, name="company"), nullable=True, comment="Empresa objetivo de la solicitud")
    message = Column(Text, nullable=True, comment="Mensaje opcional para el trabajador")
    status = Column(
        Enum(InspectionRequestStatus, name="inspection_request_status"),
        nullable=False,
        default=InspectionRequestStatus.PENDING,
        server_default=InspectionRequestStatus.PENDING.value,
    )
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    requester = relationship("User", foreign_keys=[requested_by], backref="inspection_requests_sent")
    target_user = relationship("User", foreign_keys=[target_user_id], backref="inspection_requests")

    def __repr__(self) -> str:
        return (
            "<TruckInspectionRequest(id={id}, requested_by={rb}, target_user_id={tu}, status={status})>".format(
                id=self.id,
                rb=self.requested_by,
                tu=self.target_user_id,
                status=self.status.value if isinstance(self.status, InspectionRequestStatus) else self.status,
            )
        )
