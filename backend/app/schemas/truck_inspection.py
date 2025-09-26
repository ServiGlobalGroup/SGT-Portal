"""Esquemas Pydantic para inspecciones de camiones."""
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, validator


class InspectionComponentBase(BaseModel):
    """Esquema base para un componente de inspección."""
    status: bool = Field(..., description="Estado del componente: true=bien, false=mal")
    notes: Optional[str] = Field(None, description="Notas adicionales si hay problemas")
    image_path: Optional[str] = Field(None, description="Ruta de la imagen adjunta")


class TruckInspectionCreate(BaseModel):
    """Esquema para crear una nueva inspección de camión."""
    truck_license_plate: str = Field(
        ..., 
        min_length=3, 
        max_length=16, 
        description="Matrícula del camión"
    )
    
    # Componentes de inspección
    tires_status: bool = Field(..., description="Estado de neumáticos")
    tires_notes: Optional[str] = Field(None, description="Notas sobre neumáticos")
    
    brakes_status: bool = Field(..., description="Estado de frenos")
    brakes_notes: Optional[str] = Field(None, description="Notas sobre frenos")
    
    lights_status: bool = Field(..., description="Estado de luces")
    lights_notes: Optional[str] = Field(None, description="Notas sobre luces")
    
    fluids_status: bool = Field(..., description="Estado de fluidos")
    fluids_notes: Optional[str] = Field(None, description="Notas sobre fluidos")
    
    documentation_status: bool = Field(..., description="Estado de documentación")
    documentation_notes: Optional[str] = Field(None, description="Notas sobre documentación")
    
    body_status: bool = Field(..., description="Estado de carrocería")
    body_notes: Optional[str] = Field(None, description="Notas sobre carrocería")
    
    general_notes: Optional[str] = Field(None, description="Notas generales de la inspección")
    
    @validator('truck_license_plate')
    def validate_license_plate(cls, v):
        """Valida y normaliza la matrícula."""
        if v:
            return v.strip().upper()
        return v
    
    @validator('tires_notes', 'brakes_notes', 'lights_notes', 'fluids_notes', 'documentation_notes', 'body_notes', 'general_notes')
    def validate_notes(cls, v):
        """Valida las notas."""
        if v and len(v.strip()) == 0:
            return None
        return v.strip() if v else None


class TruckInspectionUpdate(BaseModel):
    """Esquema para actualizar rutas de imágenes en una inspección existente."""
    tires_image_path: Optional[str] = None
    brakes_image_path: Optional[str] = None
    lights_image_path: Optional[str] = None
    fluids_image_path: Optional[str] = None
    documentation_image_path: Optional[str] = None
    body_image_path: Optional[str] = None


class TruckInspectionMarkReviewed(BaseModel):
    """Esquema para marcar una inspección como revisada."""
    revision_notes: Optional[str] = Field(None, description="Notas de la revisión del taller")
    
    @validator('revision_notes')
    def validate_revision_notes(cls, v):
        """Valida las notas de revisión."""
        if v and len(v.strip()) == 0:
            return None
        return v.strip() if v else None


class TruckInspectionResponse(BaseModel):
    """Esquema de respuesta para inspecciones de camiones."""
    id: int
    user_id: int
    truck_license_plate: str
    
    # Componentes de inspección
    tires_status: bool
    tires_notes: Optional[str]
    tires_image_path: Optional[str]
    
    brakes_status: bool
    brakes_notes: Optional[str]
    brakes_image_path: Optional[str]
    
    lights_status: bool
    lights_notes: Optional[str]
    lights_image_path: Optional[str]
    
    fluids_status: bool
    fluids_notes: Optional[str]
    fluids_image_path: Optional[str]
    
    documentation_status: bool
    documentation_notes: Optional[str]
    documentation_image_path: Optional[str]
    
    body_status: bool
    body_notes: Optional[str]
    body_image_path: Optional[str]
    
    # Metadata
    has_issues: bool
    general_notes: Optional[str]
    
    # Campos de revisión
    is_reviewed: bool = False
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    revision_notes: Optional[str] = None
    reviewer_name: Optional[str] = None
    
    inspection_date: datetime
    created_at: datetime
    updated_at: datetime
    
    # Información del usuario (opcional)
    user_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class TruckInspectionSummary(BaseModel):
    """Esquema resumido para listas e historiales."""
    id: int
    user_id: int
    user_name: str
    truck_license_plate: str
    has_issues: bool
    inspection_date: datetime
    components_with_issues: list[str]
    company: str | None = None
    is_reviewed: bool | None = None
    
    class Config:
        from_attributes = True


class InspectionNeededResponse(BaseModel):
    """Respuesta para verificar si se necesita una inspección."""
    needs_inspection: bool
    last_inspection_date: Optional[datetime]
    next_inspection_date: Optional[datetime] = None
    days_since_last_inspection: Optional[int]
    message: str
    manual_requests: Optional[List["ManualInspectionRequest"]] = None
    inspection_interval_days: int = 15


class InspectionStatsResponse(BaseModel):
    """Estadísticas de inspecciones."""
    total_inspections: int
    inspections_with_issues: int
    inspections_ok: int
    percentage_with_issues: float
    most_common_issues: Dict[str, int]
    recent_inspections: list[TruckInspectionSummary]


class ImageUploadResponse(BaseModel):
    """Respuesta para subida de imágenes."""
    success: bool
    image_path: Optional[str]
    message: str


class ManualInspectionRequest(BaseModel):
    """Información resumida de una solicitud manual de inspección."""

    request_id: int
    requested_by: Optional[str] = None
    message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TruckInspectionRequestRecipient(BaseModel):
    """Detalle de cada destinatario afectado por una solicitud manual."""

    request_id: int
    user_id: int
    user_name: str


class TruckInspectionRequestCreate(BaseModel):
    """Payload para crear solicitudes manuales de inspección."""

    target_user_ids: List[int] = Field(default_factory=list, description="Lista de IDs de usuarios específicos")
    send_to_all: bool = Field(False, description="Si es True, se envía a todos los trabajadores de la empresa efectiva")
    message: Optional[str] = Field(None, max_length=500, description="Mensaje opcional")

    @validator('target_user_ids', each_item=True)
    def validate_user_ids(cls, value: int) -> int:
        if value <= 0:
            raise ValueError('Los IDs de usuario deben ser positivos')
        return value

    @validator('message')
    def normalize_message(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned if cleaned else None

    @validator('send_to_all')
    def ensure_scope(cls, send_to_all: bool, values: Dict[str, Any]) -> bool:
        if not send_to_all and not values.get('target_user_ids'):
            raise ValueError('Debe seleccionar al menos un usuario o marcar send_to_all')
        return send_to_all


class TruckInspectionRequestResult(BaseModel):
    """Respuesta tras crear solicitudes manuales."""

    created_count: int
    skipped_existing: int
    recipients: List[TruckInspectionRequestRecipient]
    message: str