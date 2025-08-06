from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import os
import json
from typing import Optional

class MaintenanceMiddleware(BaseHTTPMiddleware):
    """
    Middleware para verificar el modo de mantenimiento.
    Bloquea todas las peticiones excepto las del usuario maestro cuando está activo.
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.maintenance_file = "maintenance_status.json"
        
    def is_maintenance_mode(self) -> tuple[bool, Optional[str]]:
        """Verificar si el sistema está en modo de mantenimiento"""
        try:
            if os.path.exists(self.maintenance_file):
                with open(self.maintenance_file, 'r') as f:
                    data = json.load(f)
                    return data.get('maintenance_mode', False), data.get('maintenance_message', 'Sistema en mantenimiento')
        except Exception:
            pass
        return False, None
    
    def is_excluded_path(self, path: str) -> bool:
        """Verificar si la ruta está excluida del modo de mantenimiento"""
        excluded_paths = [
            "/api/auth/login",  # Permitir login para que el master admin pueda acceder
            "/api/settings/maintenance/status",  # Permitir verificar el estado
            "/docs",  # Documentación API
            "/openapi.json",  # OpenAPI spec
            "/favicon.ico",  # Favicon
            "/health",  # Health check
        ]
        
        return any(path.startswith(excluded) for excluded in excluded_paths)
    
    def is_master_admin_token(self, authorization: Optional[str]) -> bool:
        """
        Verificar si el token pertenece al usuario maestro.
        Implementación simplificada - en producción se haría la verificación completa del JWT.
        """
        if not authorization or not authorization.startswith('Bearer '):
            return False
            
        # Aquí se haría la verificación completa del JWT para determinar si es el master admin
        # Por ahora, permitimos que las peticiones con token pasen para que el sistema
        # pueda verificar internamente si es el master admin
        return True  # Permitir que pase al endpoint para verificación interna
    
    async def dispatch(self, request: Request, call_next):
        """Procesar la petición"""
        
        # Verificar modo de mantenimiento
        maintenance_active, maintenance_message = self.is_maintenance_mode()
        
        if not maintenance_active:
            # No hay mantenimiento, proceder normalmente
            return await call_next(request)
        
        # Sistema en mantenimiento - verificar excepciones
        path = request.url.path
        
        # Permitir rutas excluidas
        if self.is_excluded_path(path):
            return await call_next(request)
        
        # Verificar si es el usuario maestro
        authorization = request.headers.get('authorization')
        if authorization and self.is_master_admin_token(authorization):
            # Permitir que pase para verificación interna del master admin
            return await call_next(request)
        
        # Bloquear acceso para todos los demás
        return JSONResponse(
            status_code=503,
            content={
                "error": "Sistema en mantenimiento",
                "message": maintenance_message,
                "maintenance_mode": True,
                "retry_after": "Contacte al administrador del sistema"
            }
        )
