from fastapi import APIRouter
from app.models.schemas import DashboardStats
from datetime import datetime

router = APIRouter()

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    return DashboardStats(
        total_users=1250,
        active_sessions=48,
        total_documents=3420,
        pending_requests=12
    )

@router.get("/recent-activity")
async def get_recent_activity():
    return {
        "activities": [
            {
                "id": 1,
                "user": "Juan Pérez",
                "action": "Subió documento",
                "timestamp": datetime.now().isoformat(),
                "type": "document"
            },
            {
                "id": 2,
                "user": "María García",
                "action": "Solicitó vacaciones",
                "timestamp": datetime.now().isoformat(),
                "type": "vacation"
            },
            {
                "id": 3,
                "user": "Carlos López",
                "action": "Visitó página de tráfico",
                "timestamp": datetime.now().isoformat(),
                "type": "traffic"
            }
        ]
    }
