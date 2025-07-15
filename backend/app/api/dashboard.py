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
        "activities": []
    }
