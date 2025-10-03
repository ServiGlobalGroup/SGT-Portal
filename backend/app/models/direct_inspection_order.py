"""Modelos para órdenes directas de inspección emitidas por roles superiores hacia taller.

Estas órdenes permiten registrar incidencias inmediatas sobre un vehículo sin esperar a la próxima inspección periódica.
"""
from __future__ import annotations

import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, func, Boolean
from sqlalchemy.orm import relationship

from app.database.connection import Base
from app.models.company_enum import Company


class VehicleKind(enum.Enum):
    TRACTORA = "TRACTORA"
    SEMIREMOLQUE = "SEMIREMOLQUE"


class DirectInspectionOrder(Base):
    __tablename__ = "direct_inspection_orders"

    id = Column(Integer, primary_key=True, index=True)
    truck_license_plate = Column(String(16), nullable=False, index=True)
    vehicle_kind = Column(Enum(VehicleKind, name="vehicle_kind"), nullable=False, index=True)
    company = Column(Enum(Company, name="company"), nullable=True, comment="Empresa asociada")

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Campos de revisión
    is_reviewed = Column(Boolean, nullable=False, server_default="false", index=True, comment="Indica si fue revisada por taller")
    reviewed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True, comment="Usuario que revisó")
    reviewed_at = Column(DateTime(timezone=True), nullable=True, comment="Fecha de revisión")
    revision_notes = Column(Text, nullable=True, comment="Notas de la revisión")

    # Relaciones
    created_by = relationship("User", foreign_keys=[created_by_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])
    modules = relationship(
        "DirectInspectionOrderModule",
        back_populates="order",
        cascade="all, delete-orphan",
        order_by="DirectInspectionOrderModule.id",
    )

    def __repr__(self) -> str:  # pragma: no cover - debug
        return f"<DirectInspectionOrder id={self.id} plate={self.truck_license_plate} kind={self.vehicle_kind}>"


class DirectInspectionOrderModule(Base):
    __tablename__ = "direct_inspection_order_modules"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("direct_inspection_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    order = relationship("DirectInspectionOrder", back_populates="modules")

    def __repr__(self) -> str:  # pragma: no cover - debug
        return f"<DirectInspectionOrderModule id={self.id} order_id={self.order_id} title={self.title!r}>"
