from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class DashboardStats(BaseModel):
    total_users: int
    active_sessions: int
    total_documents: int
    pending_requests: int

class TrafficData(BaseModel):
    id: int
    timestamp: datetime
    page: str
    visitors: int
    duration: float

from pydantic import BaseModel, validator
from datetime import datetime
from typing import Optional, List
from enum import Enum

class VacationStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class VacationRequestBase(BaseModel):
    start_date: datetime
    end_date: datetime
    reason: str

    @validator('end_date')
    def end_date_must_be_after_start_date(cls, v, values, **kwargs):
        if 'start_date' in values and v < values['start_date']:
            raise ValueError('La fecha de fin debe ser posterior a la fecha de inicio')
        return v

class VacationRequestCreate(VacationRequestBase):
    pass

class VacationRequestUpdate(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    reason: Optional[str] = None
    status: Optional[VacationStatus] = None
    admin_response: Optional[str] = None

class VacationRequestResponse(VacationRequestBase):
    id: int
    user_id: int
    status: VacationStatus
    admin_response: Optional[str] = None
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Campos calculados
    duration_days: Optional[int] = None
    employee_name: Optional[str] = None
    reviewer_name: Optional[str] = None

    class Config:
        from_attributes = True

class VacationStats(BaseModel):
    total_requests: int
    pending: int
    approved: int
    rejected: int
    current_year_total: int
    current_year_approved: int

# Mantener el schema anterior para compatibilidad temporal
class VacationRequest(BaseModel):
    id: Optional[int] = None
    employee_name: str
    start_date: datetime
    end_date: datetime
    reason: str
    status: str = "pending"

class Document(BaseModel):
    id: Optional[int] = None
    title: str
    description: str
    file_url: str
    category: str
    uploaded_date: datetime
    size: int

class TrafficFolder(BaseModel):
    id: Optional[int] = None
    name: str
    type: str  # 'company', 'vehicle_type', 'vehicle'
    parent_id: Optional[int] = None
    created_date: Optional[datetime] = None

class TrafficDocument(BaseModel):
    id: Optional[int] = None
    name: str
    file_url: str
    file_size: int
    file_type: str
    folder_id: int
    uploaded_date: Optional[datetime] = None
    uploaded_by: str

class PayrollDocument(BaseModel):
    id: Optional[int] = None
    user_id: int
    user_name: str
    type: str  # 'nomina' or 'dieta'
    month: str  # YYYY-MM format
    file_url: str
    file_name: str
    file_size: int
    upload_date: datetime
    status: str = "active"  # 'active' or 'archived'

class User(BaseModel):
    id: Optional[int] = None
    name: str
    email: str
    role: str  # 'admin' or 'user'
    department: str
    is_active: bool = True

class PayrollStats(BaseModel):
    total_documents: int
    users_with_documents: int
    current_month_uploads: int
    total_size: int
    by_type: dict  # {'nomina': count, 'dieta': count}

class Order(BaseModel):
    id: Optional[int] = None
    order_number: str
    company_name: str
    email_received_from: str
    subject: str
    received_date: datetime
    status: str = "pending"  # 'pending', 'processing', 'completed', 'cancelled'
    priority: str = "normal"  # 'low', 'normal', 'high', 'urgent'
    
class OrderDocument(BaseModel):
    id: Optional[int] = None
    order_id: int
    file_name: str
    file_url: str
    file_size: int
    file_type: str
    uploaded_date: Optional[datetime] = None
    email_attachment_name: str

class PayrollProcessingResult(BaseModel):
    """Resultado del procesamiento de un PDF con múltiples nóminas"""
    page_number: int
    dni_nie_found: Optional[str] = None
    user_folder_exists: bool = False
    pdf_saved: bool = False
    saved_path: Optional[str] = None
    success: bool = False
    error_message: Optional[str] = None

class PayrollProcessingSummary(BaseModel):
    """Resumen del procesamiento de nóminas múltiples"""
    processed_pages: int
    successful_assignments: int
    failed_assignments: int
    assignment_details: List[PayrollProcessingResult]
    errors: List[str]
    filename: str
    month_year: str
    processed_at: datetime

class UserFolderStatus(BaseModel):
    """Estado de la carpeta de un usuario"""
    dni_nie: str
    has_nominas_folder: bool
    nominas_count: int

class UploadHistoryItem(BaseModel):
    """Item del historial de subidas"""
    id: Optional[int] = None
    file_name: str
    upload_date: datetime
    user_dni: str
    user_name: str
    document_type: str  # 'nominas' | 'dietas'
    month: str
    year: str
    total_pages: int
    successful_pages: int
    failed_pages: int
    status: str  # 'processing' | 'completed' | 'error'
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class UploadHistoryResponse(BaseModel):
    """Respuesta del historial de subidas"""
    items: List[UploadHistoryItem]
    total: int

# -------------------- Dietas --------------------
class DietaConcept(BaseModel):
    code: str
    label: str
    quantity: float  # permitir 0.5 (media)
    rate: float
    subtotal: float

class DietaRecordCreate(BaseModel):
    user_id: int
    worker_type: str
    order_number: str  # obligatorio: OC / Albarán
    month: str  # YYYY-MM-DD
    concepts: List[DietaConcept]
    total_amount: float
    notes: str | None = None

class DietaRecordResponse(BaseModel):
    id: int
    user_id: int
    worker_type: str
    order_number: str | None
    month: str  # YYYY-MM-DD
    total_amount: float
    concepts: List[DietaConcept]
    notes: str | None
    created_at: datetime
    user_name: str | None = None

    class Config:
        from_attributes = True

# -------------------- Distancieros --------------------
class DistancieroBase(BaseModel):
    client_name: str
    destination: str
    destination_normalized: str
    km: float
    active: bool
    notes: str | None = None
    # Campos de caché (pueden venir nulos para registros clásicos)
    origin: str | None = None
    origin_normalized: str | None = None
    mode: str | None = None
    duration_sec: int | None = None
    polyline: str | None = None

class DistancieroCreate(BaseModel):
    client_name: str
    destination: str
    km: float
    active: bool = True
    notes: str | None = None

class DistancieroUpdate(BaseModel):
    client_name: str | None = None
    destination: str | None = None
    km: float | None = None
    active: bool | None = None
    notes: str | None = None

class DistancieroResponse(DistancieroBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DistancieroGrouped(BaseModel):
    client_name: str
    total_routes: int
    active_routes: int
    min_km: float | None
    max_km: float | None

    class Config:
        from_attributes = True
