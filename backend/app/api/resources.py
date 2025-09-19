from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from app.database.connection import get_db
from app.api.auth import get_current_user
from app.models.user import User, UserRole
from datetime import datetime

router = APIRouter(prefix="/api/resources", tags=["resources"])

CREATE_ROLES = {UserRole.MASTER_ADMIN, UserRole.ADMINISTRADOR, UserRole.ADMINISTRACION}


@router.post("/fuel-cards", status_code=status.HTTP_201_CREATED)
def create_fuel_card(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in CREATE_ROLES:
        raise HTTPException(status_code=403, detail="Permiso denegado")
    
    try:
        pan = payload.get('pan', '').strip()
        matricula = payload.get('matricula', '').strip()
        pin = payload.get('pin', '').strip()
        caducidad = payload.get('caducidad')
        
        if not all([pan, matricula, pin]):
            raise HTTPException(status_code=400, detail="Faltan campos requeridos")
        
        # Usar SQLAlchemy text() para queries raw
        query = text("""
            INSERT INTO fuel_cards (pan, matricula, pin, caducidad, created_by)
            VALUES (:pan, :matricula, :pin, :caducidad, :created_by)
            RETURNING id, created_at
        """)
        
        result = db.execute(query, {
            'pan': pan,
            'matricula': matricula, 
            'pin': pin,
            'caducidad': caducidad,
            'created_by': getattr(current_user, 'id', None)
        })
        
        row = result.fetchone()
        db.commit()
        
        return {
            "id": row[0] if row else 1,
            "pan": pan,
            "matricula": matricula,
            "caducidad": caducidad,
            "created_at": row[1].isoformat() if row and row[1] else datetime.utcnow().isoformat(),
            "masked_pin": "•" * len(pin),
            "pin": pin
        }
        
    except Exception as e:
        db.rollback()
        print(f"Error creating fuel card: {e}")
        raise HTTPException(status_code=500, detail=f"Error creando tarjeta de combustible: {str(e)}")


@router.get("/fuel-cards")
def list_fuel_cards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    pan: Optional[str] = Query(None),
    matricula: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
):
    try:
        query = text("SELECT id, pan, matricula, caducidad, pin, compania, created_by, created_at FROM fuel_cards ORDER BY id DESC LIMIT :limit OFFSET :offset")
        offset = (page - 1) * page_size
        
        result = db.execute(query, {'limit': page_size, 'offset': offset})
        rows = result.fetchall()
        
        items = []
        for row in rows:
            pin_val = row[4] if len(row) > 4 and row[4] else ''
            items.append({
                "id": row[0],
                "pan": row[1] or '',
                "matricula": row[2] or '', 
                "caducidad": row[3].isoformat() if row[3] else None,
                "compania": row[5] or '',
                "created_at": row[7].isoformat() if row[7] else None,
                "masked_pin": "•" * len(pin_val),
                "pin": pin_val
            })
            
        return {
            "total": len(items),
            "page": page,
            "page_size": page_size,
            "items": items
        }
        
    except Exception as e:
        print(f"Error listing fuel cards: {e}")
        return {
            "total": 0,
            "page": page,
            "page_size": page_size,
            "items": []
        }


@router.post("/via-t-devices", status_code=status.HTTP_201_CREATED)
def create_via_t(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in CREATE_ROLES:
        raise HTTPException(status_code=403, detail="Permiso denegado")
    
    try:
        numero_telepeaje = payload.get('numero_telepeaje', '').strip()
        pan = payload.get('pan', '').strip()
        matricula = payload.get('matricula', '').strip()
        caducidad = payload.get('caducidad')
        
        if not all([numero_telepeaje, pan, matricula]):
            raise HTTPException(status_code=400, detail="Faltan campos requeridos")
        
        query = text("""
            INSERT INTO via_t_devices (numero_telepeaje, pan, matricula, caducidad, created_by)
            VALUES (:numero_telepeaje, :pan, :matricula, :caducidad, :created_by)
            RETURNING id, created_at
        """)
        
        result = db.execute(query, {
            'numero_telepeaje': numero_telepeaje,
            'pan': pan,
            'matricula': matricula,
            'caducidad': caducidad,
            'created_by': getattr(current_user, 'id', None)
        })
        
        row = result.fetchone()
        db.commit()
        
        return {
            "id": row[0] if row else 1,
            "numero_telepeaje": numero_telepeaje,
            "pan": pan,
            "matricula": matricula,
            "caducidad": caducidad,
            "created_at": row[1].isoformat() if row and row[1] else datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        db.rollback()
        print(f"Error creating via-t: {e}")
        raise HTTPException(status_code=500, detail=f"Error creando dispositivo Via-T: {str(e)}")


@router.get("/via-t-devices")
def list_via_t(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    numero_telepeaje: Optional[str] = Query(None),
    pan: Optional[str] = Query(None),
    matricula: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
):
    try:
        query = text("SELECT id, numero_telepeaje, pan, compania, matricula, caducidad, created_by, created_at FROM via_t_devices ORDER BY id DESC LIMIT :limit OFFSET :offset")
        offset = (page - 1) * page_size
        
        result = db.execute(query, {'limit': page_size, 'offset': offset})
        rows = result.fetchall()
        
        items = []
        for row in rows:
            items.append({
                "id": row[0],
                "numero_telepeaje": row[1] or '',
                "pan": row[2] or '',
                "compania": row[3] or '',
                "matricula": row[4] or '',
                "caducidad": row[5].isoformat() if row[5] else None,
                "created_at": row[7].isoformat() if row[7] else None
            })
            
        return {
            "total": len(items),
            "page": page,
            "page_size": page_size,
            "items": items
        }
        
    except Exception as e:
        print(f"Error listing via-t: {e}")
        return {
            "total": 0,
            "page": page,
            "page_size": page_size,
            "items": []
        }