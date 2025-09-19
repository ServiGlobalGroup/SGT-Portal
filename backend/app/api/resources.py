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


@router.put("/fuel-cards/{card_id}")
def update_fuel_card(
    card_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in CREATE_ROLES:
        raise HTTPException(status_code=403, detail="Permiso denegado")
    
    try:
        # Verificar que la tarjeta existe
        check_query = text("SELECT id FROM fuel_cards WHERE id = :id")
        result = db.execute(check_query, {'id': card_id})
        if not result.fetchone():
            raise HTTPException(status_code=404, detail="Tarjeta no encontrada")
        
        pan = payload.get('pan', '').strip()
        matricula = payload.get('matricula', '').strip()
        pin = payload.get('pin', '').strip()
        caducidad = payload.get('caducidad')
        
        if not all([pan, matricula, pin]):
            raise HTTPException(status_code=400, detail="Faltan campos requeridos")
        
        # Actualizar la tarjeta
        update_query = text("""
            UPDATE fuel_cards 
            SET pan = :pan, matricula = :matricula, pin = :pin, caducidad = :caducidad, updated_at = now()
            WHERE id = :id
            RETURNING id, pan, matricula, caducidad, pin, created_at, updated_at
        """)
        
        result = db.execute(update_query, {
            'id': card_id,
            'pan': pan,
            'matricula': matricula,
            'pin': pin,
            'caducidad': caducidad
        })
        
        row = result.fetchone()
        db.commit()
        
        return {
            "id": row[0],
            "pan": row[1],
            "matricula": row[2],
            "caducidad": row[3].isoformat() if row[3] else None,
            "created_at": row[5].isoformat() if row[5] else None,
            "masked_pin": "•" * len(row[4]),
            "pin": row[4]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating fuel card: {e}")
        raise HTTPException(status_code=500, detail=f"Error actualizando tarjeta de combustible: {str(e)}")


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
        print(f"[DEBUG] List fuel cards called with filters: pan={pan}, matricula={matricula}")
        
        # Construir query con filtros dinámicos
        where_conditions = []
        params = {'limit': page_size, 'offset': (page - 1) * page_size}
        
        if pan and pan.strip():
            where_conditions.append("pan ILIKE :pan")
            params['pan'] = f"%{pan.strip()}%"
        
        if matricula and matricula.strip():
            where_conditions.append("matricula ILIKE :matricula")
            params['matricula'] = f"%{matricula.strip()}%"
        
        where_clause = ""
        if where_conditions:
            where_clause = "WHERE " + " AND ".join(where_conditions)
        
        final_query = f"""
            SELECT id, pan, matricula, caducidad, pin, created_by, created_at 
            FROM fuel_cards 
            {where_clause}
            ORDER BY id DESC 
            LIMIT :limit OFFSET :offset
        """
        
        print(f"[DEBUG] Executing query: {final_query}")
        print(f"[DEBUG] With params: {params}")
        
        query = text(final_query)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        print(f"[DEBUG] Found {len(rows)} rows")
        
        # Calcular total con los mismos filtros (sin LIMIT/OFFSET)
        count_query = text(f"""
            SELECT COUNT(*) FROM fuel_cards {where_clause}
        """)
        count_result = db.execute(count_query, {k: v for k, v in params.items() if k not in ['limit', 'offset']})
        total = count_result.scalar() or 0
        
        print(f"[DEBUG] Total count: {total}")
        
        items = []
        for row in rows:
            pin_val = row[4] if len(row) > 4 and row[4] else ''
            item = {
                "id": row[0],
                "pan": row[1] or '',
                "matricula": row[2] or '', 
                "caducidad": row[3].isoformat() if row[3] else None,
                "compania": '',  # Campo legacy, ahora vacío
                "created_at": row[6].isoformat() if len(row) > 6 and row[6] else None,
                "masked_pin": "•" * len(pin_val),
                "pin": pin_val
            }
            items.append(item)
            print(f"[DEBUG] Added fuel card item: {item}")
            
        response = {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": items
        }
        
        print(f"[DEBUG] Returning fuel cards response: {response}")
        return response
        
    except Exception as e:
        print(f"Error listing fuel cards: {e}")
        raise HTTPException(status_code=500, detail=f"Error al obtener tarjetas de combustible: {str(e)}")


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


@router.put("/via-t-devices/{device_id}")
def update_via_t(
    device_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in CREATE_ROLES:
        raise HTTPException(status_code=403, detail="Permiso denegado")
    
    try:
        # Verificar que el dispositivo existe
        check_query = text("SELECT id FROM via_t_devices WHERE id = :id")
        result = db.execute(check_query, {'id': device_id})
        if not result.fetchone():
            raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
        
        numero_telepeaje = payload.get('numero_telepeaje', '').strip()
        pan = payload.get('pan', '').strip()
        matricula = payload.get('matricula', '').strip()
        caducidad = payload.get('caducidad')
        
        if not all([numero_telepeaje, pan, matricula]):
            raise HTTPException(status_code=400, detail="Faltan campos requeridos")
        
        # Actualizar el dispositivo
        update_query = text("""
            UPDATE via_t_devices 
            SET numero_telepeaje = :numero_telepeaje, pan = :pan, matricula = :matricula, caducidad = :caducidad, updated_at = now()
            WHERE id = :id
            RETURNING id, numero_telepeaje, pan, matricula, caducidad, created_at, updated_at
        """)
        
        result = db.execute(update_query, {
            'id': device_id,
            'numero_telepeaje': numero_telepeaje,
            'pan': pan,
            'matricula': matricula,
            'caducidad': caducidad
        })
        
        row = result.fetchone()
        db.commit()
        
        return {
            "id": row[0],
            "numero_telepeaje": row[1],
            "pan": row[2],
            "matricula": row[3],
            "caducidad": row[4].isoformat() if row[4] else None,
            "created_at": row[5].isoformat() if row[5] else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating via-t device: {e}")
        raise HTTPException(status_code=500, detail=f"Error actualizando dispositivo Via-T: {str(e)}")


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
        print(f"[DEBUG] List via-t called with filters: numero_telepeaje={numero_telepeaje}, pan={pan}, matricula={matricula}")
        
        # Construir query con filtros dinámicos
        where_conditions = []
        params = {'limit': page_size, 'offset': (page - 1) * page_size}
        
        if numero_telepeaje and numero_telepeaje.strip():
            where_conditions.append("numero_telepeaje ILIKE :numero_telepeaje")
            params['numero_telepeaje'] = f"%{numero_telepeaje.strip()}%"
        
        if pan and pan.strip():
            where_conditions.append("pan ILIKE :pan")
            params['pan'] = f"%{pan.strip()}%"
        
        if matricula and matricula.strip():
            where_conditions.append("matricula ILIKE :matricula")
            params['matricula'] = f"%{matricula.strip()}%"
        
        where_clause = ""
        if where_conditions:
            where_clause = "WHERE " + " AND ".join(where_conditions)
        
        final_query = f"""
            SELECT id, numero_telepeaje, pan, matricula, caducidad, created_by, created_at 
            FROM via_t_devices 
            {where_clause}
            ORDER BY id DESC 
            LIMIT :limit OFFSET :offset
        """
        
        print(f"[DEBUG] Executing query: {final_query}")
        print(f"[DEBUG] With params: {params}")
        
        query = text(final_query)
        
        result = db.execute(query, params)
        rows = result.fetchall()
        
        print(f"[DEBUG] Found {len(rows)} rows")
        
        # Calcular total con los mismos filtros (sin LIMIT/OFFSET)
        count_query = text(f"""
            SELECT COUNT(*) FROM via_t_devices {where_clause}
        """)
        count_result = db.execute(count_query, {k: v for k, v in params.items() if k not in ['limit', 'offset']})
        total = count_result.scalar() or 0
        
        print(f"[DEBUG] Total count: {total}")
        
        items = []
        for row in rows:
            item = {
                "id": row[0],
                "numero_telepeaje": row[1] or '',
                "pan": row[2] or '',
                "compania": '',  # Campo legacy, ahora vacío
                "matricula": row[3] or '',
                "caducidad": row[4].isoformat() if row[4] else None,
                "created_at": row[6].isoformat() if len(row) > 6 and row[6] else None
            }
            items.append(item)
            print(f"[DEBUG] Added item: {item}")
            
        response = {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": items
        }
        
        print(f"[DEBUG] Returning response: {response}")
        return response
        
    except Exception as e:
        print(f"Error listing via-t: {e}")
        raise HTTPException(status_code=500, detail=f"Error al obtener dispositivos Via-T: {str(e)}")