from .user import User, UserRole, MasterAdminUser
from .dieta import DietaRecord
from .trip import TripRecord
from .vacation import VacationRequest, VacationStatus
from .activity_log import ActivityLog
from .distanciero import Distanciero
from .truck_inspection import TruckInspection
from .truck_inspection_request import TruckInspectionRequest, InspectionRequestStatus

__all__ = [
    "User", "UserRole", "MasterAdminUser", 
    "DietaRecord", 
    "TripRecord", 
    "VacationRequest", "VacationStatus",
    "ActivityLog",
    "Distanciero",
    "TruckInspection",
    "TruckInspectionRequest", "InspectionRequestStatus",
]
