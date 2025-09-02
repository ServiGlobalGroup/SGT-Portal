from datetime import date, datetime
from pydantic import BaseModel, Field
from typing import Optional, List

class TripBase(BaseModel):
    order_number: str = Field(..., max_length=100, description="Albarán / OC")
    pernocta: bool = False
    festivo: bool = False
    event_date: date
    note: Optional[str] = Field(None, max_length=500)

class TripCreate(TripBase):
    pass

class TripOut(TripBase):
    id: int
    created_at: datetime
    user_id: int
    user_name: Optional[str] = None

    class Config:
        from_attributes = True

class TripPage(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[TripOut]
