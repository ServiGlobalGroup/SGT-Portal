from pydantic import BaseModel
from typing import List, Optional
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
