from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class FuelCardBase(BaseModel):
    pan: str = Field(..., max_length=64)
    matricula: str = Field(..., max_length=16)
    caducidad: Optional[date] = None

class FuelCardCreate(FuelCardBase):
    pin: str = Field(..., min_length=1, max_length=32)

class FuelCardOut(FuelCardBase):
    id: int
    created_at: datetime
    masked_pin: str
    pin: str  # Exponer en claro (revisar en futuro: cifrado / endpoint restringido)

    @classmethod
    def from_orm_with_mask(cls, obj):
        pin_val = getattr(obj, 'pin', '') or ''
        return cls(
            id=obj.id,
            pan=obj.pan,
            matricula=obj.matricula,
            caducidad=obj.caducidad,
            created_at=obj.created_at,
            masked_pin='•' * len(pin_val),
            pin=pin_val
        )

    class Config:
        from_attributes = True


class ViaTDeviceBase(BaseModel):
    numero_telepeaje: str = Field(..., max_length=64)
    pan: str = Field(..., max_length=64)
    compania: Optional[str] = Field(None, max_length=64)
    matricula: str = Field(..., max_length=16)
    caducidad: Optional[date] = None

class ViaTDeviceCreate(ViaTDeviceBase):
    pass

class ViaTDeviceOut(ViaTDeviceBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class FuelCardPage(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[FuelCardOut]

class ViaTDevicePage(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[ViaTDeviceOut]
