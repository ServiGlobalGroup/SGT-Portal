"""Esquemas Pydantic para órdenes directas de inspección."""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, validator

from app.models.direct_inspection_order import VehicleKind


class DirectInspectionOrderModuleIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Título breve del problema")
    notes: Optional[str] = Field(None, description="Observaciones adicionales")

    @validator('title')
    def clean_title(cls, v: str) -> str:
        v2 = v.strip()
        if not v2:
            raise ValueError('El título no puede estar vacío')
        return v2

    @validator('notes')
    def clean_notes(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        vv = v.strip()
        return vv if vv else None


class DirectInspectionOrderCreate(BaseModel):
    truck_license_plate: str = Field(..., min_length=3, max_length=16)
    vehicle_kind: VehicleKind
    modules: List[DirectInspectionOrderModuleIn] = Field(..., description="Listado de módulos / incidencias")

    @validator('truck_license_plate')
    def normalize_plate(cls, v: str) -> str:
        v2 = v.strip().upper()
        return v2


class DirectInspectionOrderModuleOut(BaseModel):
    id: int
    title: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DirectInspectionOrderResponse(BaseModel):
    order_id: int
    truck_license_plate: str
    vehicle_kind: VehicleKind
    created_at: datetime
    created_by: str
    created_by_id: int
    modules: List[DirectInspectionOrderModuleOut]
    is_reviewed: bool = False
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    revision_notes: Optional[str] = None
    message: str | None = None

    class Config:
        from_attributes = True


class DirectInspectionOrderSummary(BaseModel):
    """Resumen de orden directa para listados."""
    id: int
    truck_license_plate: str
    vehicle_kind: VehicleKind
    created_at: datetime
    created_by: str
    company: Optional[str] = None
    is_reviewed: bool = False
    modules_count: int = 0

    class Config:
        from_attributes = True


class MarkDirectOrderReviewedRequest(BaseModel):
    """Request para marcar orden directa como revisada."""
    revision_notes: Optional[str] = Field(None, description="Notas de la revisión")
