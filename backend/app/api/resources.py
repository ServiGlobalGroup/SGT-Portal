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
        # Campo nuevo / requerido a nivel DB. Si no viene desde frontend legacy, usar '' para evitar 500.
        compania = (payload.get('compania') or '').strip()
        
        if not all([pan, matricula, pin]):
            raise HTTPException(status_code=400, detail="Faltan campos requeridos")
        
        # Usar SQLAlchemy text() para queries raw
        query = text("""
            INSERT INTO fuel_cards (pan, matricula, pin, caducidad, compania, created_by)
            VALUES (:pan, :matricula, :pin, :caducidad, :compania, :created_by)
            RETURNING id, created_at, compania
        """)
        
        result = db.execute(query, {
            'pan': pan,
            'matricula': matricula, 
            'pin': pin,
            'caducidad': caducidad,
            'compania': compania,
            'created_by': getattr(current_user, 'id', None)
        })
        
        row = result.fetchone()
        db.commit()
        
        return {
            "id": row[0] if row else 1,
            "pan": pan,
            "matricula": matricula,
            "caducidad": caducidad,
            "compania": row[2] if row else compania,
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
        compania = (payload.get('compania') or '').strip()
        
        if not all([pan, matricula, pin]):
            raise HTTPException(status_code=400, detail="Faltan campos requeridos")
        
        # Actualizar la tarjeta
        update_query = text("""
            UPDATE fuel_cards 
            SET pan = :pan, matricula = :matricula, pin = :pin, caducidad = :caducidad, compania = :compania, updated_at = now()
            WHERE id = :id
            RETURNING id, pan, matricula, compania, caducidad, pin, created_at, updated_at
        """)
        
        result = db.execute(update_query, {
            'id': card_id,
            'pan': pan,
            'matricula': matricula,
            'pin': pin,
            'caducidad': caducidad,
            'compania': compania
        })
        
        row = result.fetchone()
        db.commit()
        
        return {
            "id": row[0],
            "pan": row[1],
            "matricula": row[2],
            "compania": row[3] or '',
            "caducidad": row[4].isoformat() if row[4] else None,
            "created_at": row[6].isoformat() if row[6] else None,
            "masked_pin": "•" * len(row[5]),
            "pin": row[5]
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
            SELECT id, pan, matricula, compania, 
                   CASE 
                       WHEN caducidad IS NULL THEN NULL
                       WHEN EXTRACT(YEAR FROM caducidad) > 9999 OR EXTRACT(YEAR FROM caducidad) < 1 THEN NULL
                       ELSE caducidad::text
                   END as caducidad,
                   pin, created_by,
                   CASE 
                       WHEN created_at IS NULL THEN NULL
                       WHEN EXTRACT(YEAR FROM created_at) > 9999 OR EXTRACT(YEAR FROM created_at) < 1 THEN NULL
                       ELSE created_at::text
                   END as created_at
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
            pin_val = row[5] if len(row) > 5 and row[5] else ''
            
            # Las fechas ahora vienen como texto desde SQL, solo necesitamos validarlas
            caducidad_val = row[4] if row[4] else None
            created_at_val = row[7] if len(row) > 7 and row[7] else None
            
            item = {
                "id": row[0],
                "pan": row[1] or '',
                "matricula": row[2] or '', 
                "compania": row[3] or '',
                "caducidad": caducidad_val,
                "created_at": created_at_val,
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
        compania = (payload.get('compania') or '').strip()
        
        if not all([numero_telepeaje, pan, matricula]):
            raise HTTPException(status_code=400, detail="Faltan campos requeridos")
        
        query = text("""
            INSERT INTO via_t_devices (numero_telepeaje, pan, matricula, caducidad, compania, created_by)
            VALUES (:numero_telepeaje, :pan, :matricula, :caducidad, :compania, :created_by)
            RETURNING id, created_at, compania
        """)
        
        result = db.execute(query, {
            'numero_telepeaje': numero_telepeaje,
            'pan': pan,
            'matricula': matricula,
            'caducidad': caducidad,
            'compania': compania,
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
            "compania": row[2] if row else compania,
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
        compania = (payload.get('compania') or '').strip()
        
        if not all([numero_telepeaje, pan, matricula]):
            raise HTTPException(status_code=400, detail="Faltan campos requeridos")
        
        # Actualizar el dispositivo
        update_query = text("""
            UPDATE via_t_devices 
            SET numero_telepeaje = :numero_telepeaje, pan = :pan, matricula = :matricula, caducidad = :caducidad, compania = :compania, updated_at = now()
            WHERE id = :id
            RETURNING id, numero_telepeaje, pan, compania, matricula, caducidad, created_at, updated_at
        """)
        
        result = db.execute(update_query, {
            'id': device_id,
            'numero_telepeaje': numero_telepeaje,
            'pan': pan,
            'matricula': matricula,
            'caducidad': caducidad,
            'compania': compania
        })
        
        row = result.fetchone()
        db.commit()
        
        return {
            "id": row[0],
            "numero_telepeaje": row[1],
            "pan": row[2],
            "compania": row[3] or '',
            "matricula": row[4],
            "caducidad": row[5].isoformat() if row[5] else None,
            "created_at": row[6].isoformat() if row[6] else None
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
            SELECT id, numero_telepeaje, pan, compania, matricula, caducidad, created_by, created_at 
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
                "compania": row[3] or '',
                "matricula": row[4] or '',
                "caducidad": row[5].isoformat() if row[5] else None,
                "created_at": row[7].isoformat() if len(row) > 7 and row[7] else None
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


@router.delete("/fuel-cards/{card_id}")
def delete_fuel_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in CREATE_ROLES:
        raise HTTPException(status_code=403, detail="Permiso denegado")
    
    try:
        # Verificar que la tarjeta existe
        check_query = text("SELECT id, pan, matricula FROM fuel_cards WHERE id = :id")
        result = db.execute(check_query, {'id': card_id})
        card = result.fetchone()
        
        if not card:
            raise HTTPException(status_code=404, detail="Tarjeta no encontrada")
        
        # Eliminar la tarjeta
        delete_query = text("DELETE FROM fuel_cards WHERE id = :id")
        db.execute(delete_query, {'id': card_id})
        db.commit()
        
        print(f"[DEBUG] Deleted fuel card: ID={card_id}, PAN={card[1]}, Matrícula={card[2]}")
        
        return {
            "message": "Tarjeta de combustible eliminada correctamente",
            "id": card_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error deleting fuel card: {e}")
        raise HTTPException(status_code=500, detail=f"Error eliminando tarjeta de combustible: {str(e)}")


@router.delete("/via-t-devices/{device_id}")
def delete_via_t(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in CREATE_ROLES:
        raise HTTPException(status_code=403, detail="Permiso denegado")
    
    try:
        # Verificar que el dispositivo existe
        check_query = text("SELECT id, numero_telepeaje, matricula FROM via_t_devices WHERE id = :id")
        result = db.execute(check_query, {'id': device_id})
        device = result.fetchone()
        
        if not device:
            raise HTTPException(status_code=404, detail="Dispositivo no encontrado")
        
        # Eliminar el dispositivo
        delete_query = text("DELETE FROM via_t_devices WHERE id = :id")
        db.execute(delete_query, {'id': device_id})
        db.commit()
        
        print(f"[DEBUG] Deleted via-t device: ID={device_id}, Número={device[1]}, Matrícula={device[2]}")
        
        return {
            "message": "Dispositivo Via-T eliminado correctamente",
            "id": device_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error deleting via-t device: {e}")
        raise HTTPException(status_code=500, detail=f"Error eliminando dispositivo Via-T: {str(e)}")