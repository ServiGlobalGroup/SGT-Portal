from fastapi import APIRouter
from app.models.schemas import VacationRequest
from datetime import datetime, timedelta
from typing import List
import random

router = APIRouter()

# Datos de ejemplo en memoria
# Base de datos simulada de solicitudes de vacaciones
vacation_requests = []

@router.get("/", response_model=List[VacationRequest])
async def get_vacation_requests():
    return vacation_requests

@router.post("/", response_model=VacationRequest)
async def create_vacation_request(request: VacationRequest):
    new_id = max([req.id for req in vacation_requests]) + 1
    request.id = new_id
    vacation_requests.append(request)
    return request

@router.put("/{request_id}/status")
async def update_vacation_status(request_id: int, status: str):
    for request in vacation_requests:
        if request.id == request_id:
            request.status = status
            return {"message": "Status updated successfully"}
    return {"message": "Request not found"}

@router.get("/stats")
async def get_vacation_stats():
    return {
        "total_requests": len(vacation_requests),
        "pending": len([req for req in vacation_requests if req.status == "pending"]),
        "approved": len([req for req in vacation_requests if req.status == "approved"]),
        "rejected": len([req for req in vacation_requests if req.status == "rejected"])
    }
