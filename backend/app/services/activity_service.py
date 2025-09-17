from typing import Optional, Any, Dict
from sqlalchemy.orm import Session
from app.models.activity_log import ActivityLog
from app.models.company_enum import Company


class ActivityService:
    """Servicio para registrar eventos en la tabla activity_log.

    Campos relevantes (según DDL):
      event_type: str -> uno de activityeventtype (ENUM en BD)
      message: descripción legible del evento
      actor_*: información del usuario que genera el evento
      entity_*: recurso principal sobre el que actúa (opcional)
      meta: JSON adicional (dict serializable)
    """

    # Constantes sugeridas para tipos (reflejan ENUM real)
    EVENT_LOGIN = "LOGIN"
    EVENT_VACATION_CREATED = "VACATION_REQUEST_CREATED"
    EVENT_VACATION_UPDATED = "VACATION_REQUEST_UPDATED"
    EVENT_VACATION_STATUS = "VACATION_STATUS_UPDATED"
    EVENT_FILE_UPLOAD = "FILE_UPLOAD"
    EVENT_UPLOAD_HISTORY = "UPLOAD_HISTORY"
    EVENT_USER_CREATED = "USER_CREATED"
    EVENT_USER_ROLE_CHANGED = "USER_ROLE_CHANGED"
    EVENT_OTHER = "OTHER"

    @staticmethod
    def log(
        db: Session,
        *,
        event_type: str,
        message: str,
        actor_id: Optional[int] = None,
        actor_dni: Optional[str] = None,
        actor_name: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        meta: Optional[Dict[str, Any]] = None,
        auto_commit: bool = True,
    ) -> ActivityLog:
        """Inserta un registro de actividad.

        No lanza excepción hacia arriba: si falla el insert, hace rollback silencioso
        y vuelve a lanzar la excepción para que el caller decida (modo simple ahora).
        """
        # No registrar actividad del usuario master admin (oculto)
        if actor_id == -1 or (actor_dni and 'ADMIN' in actor_dni.upper()):
            # Crear un objeto dummy para mantener compatibilidad
            dummy_entry = ActivityLog()
            setattr(dummy_entry, 'id', -1)
            return dummy_entry
            
        try:
            # Determinar compañía si viene en meta o como valor aparte en meta['company']
            company_val = None
            if meta and isinstance(meta, dict):
                mc = meta.get('company')
                try:
                    if isinstance(mc, Company):
                        company_val = mc
                    elif isinstance(mc, str) and mc:
                        company_val = Company(mc)
                except Exception:
                    company_val = None
            entry = ActivityLog(
                event_type=event_type,
                message=message[:255],  # proteger longitud
                actor_id=actor_id,
                actor_dni=actor_dni,
                actor_name=actor_name,
                entity_type=entity_type,
                entity_id=entity_id,
                meta=meta,
                company=company_val,
            )
            db.add(entry)
            if auto_commit:
                db.commit()
                db.refresh(entry)
            return entry
        except Exception:
            if auto_commit:
                db.rollback()
            raise

    @staticmethod
    def log_from_user(
        db: Session,
        *,
        user: Any,
        event_type: str,
        message: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        meta: Optional[Dict[str, Any]] = None,
    ) -> ActivityLog:
        """Helper para usuarios ORM o master user custom."""
        actor_id = getattr(user, "id", None)
        actor_dni = getattr(user, "dni_nie", None)
        # master admin puede tener first_name / last_name o full_name
        full_name = getattr(user, "full_name", None)
        if not full_name:
            first_name = getattr(user, "first_name", "")
            last_name = getattr(user, "last_name", "")
            full_name = (first_name + " " + last_name).strip() or None
        # Añadir compañía a meta si está disponible en el usuario y no está ya
        try:
            if meta is None:
                meta = {}
            if 'company' not in meta:
                comp_obj = getattr(user, 'company', None)
                if comp_obj is not None:
                    meta['company'] = getattr(comp_obj, 'value', str(comp_obj))
        except Exception:
            pass
        return ActivityService.log(
            db,
            event_type=event_type,
            message=message,
            actor_id=actor_id,
            actor_dni=actor_dni,
            actor_name=full_name,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            meta=meta,
        )

