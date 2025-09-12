from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import sys

# Ensure the 'backend' directory is on sys.path so imports like 'from app...' resolve to 'backend/app'
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.api import dashboard, traffic, vacations, documents, payroll, profile, settings, users, auth, user_files, documentation, activity, dietas, distancieros, folder_management, trips, resources
from app.database.connection import check_database_connection
from app.middleware.maintenance import MaintenanceMiddleware
from app.config import settings as app_settings
from app.services.folder_structure_service import FolderStructureService

# Habilitamos documentación para ver y validar seguridad (Bearer OAuth2)
app = FastAPI(
    title="Portal API",
    version="1.0.0",
    docs_url=None,       # Swagger UI deshabilitado
    redoc_url=None,      # ReDoc deshabilitado
    openapi_url=None     # Endpoint OpenAPI deshabilitado
)

# Agregar middleware de mantenimiento (debe ir antes que CORS)
app.add_middleware(MaintenanceMiddleware)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir rutas
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api", tags=["users"])
app.include_router(user_files.router, prefix="/api/user-files", tags=["user-files"])
app.include_router(documentation.router, prefix="/api/documentation", tags=["documentation"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(traffic.router, prefix="/api/traffic", tags=["traffic"])
app.include_router(vacations.router, prefix="/api/vacations", tags=["vacations"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(payroll.router, prefix="/api/payroll", tags=["payroll"])
# Orders deshabilitado (legacy, no usado)
app.include_router(trips.router, tags=["trips"])   # New trips module
app.include_router(profile.router, prefix="/api", tags=["profile"])
app.include_router(settings.router, prefix="/api", tags=["settings"])
app.include_router(activity.router, prefix="/api/activity", tags=["activity"]) 
app.include_router(dietas.router, prefix="/api/dietas", tags=["dietas"]) 
app.include_router(distancieros.router, prefix="/api/distancieros", tags=["distancieros"])
app.include_router(folder_management.router, prefix="/api", tags=["folder-management"])
app.include_router(resources.router)  # incluye /api/resources/*

# Inicializar sistema de carpetas al arrancar
try:
    FolderStructureService.initialize_system_folders()
    print("Sistema de carpetas inicializado correctamente")
except Exception as e:
    print(f"Error inicializando sistema de carpetas: {str(e)}")

# Nota: la ruta raíz '/' será servida por el fallback de la SPA si existe el build

@app.get("/health")
async def health_check():
    """Endpoint para verificar el estado de la aplicación y la base de datos"""
    try:
        db_status = check_database_connection()
        return {
            "status": "healthy" if db_status else "unhealthy",
            "database": "connected" if db_status else "disconnected"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "error",
            "error": str(e)
        }

# ---------- Static Frontend (Vite build) ----------
# Resolver ruta absoluta al directorio dist de Vite
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(BASE_DIR, os.pardir))
FRONTEND_DIST = os.path.join(REPO_ROOT, 'frontend', 'dist')

if os.path.isdir(FRONTEND_DIST):
    # Servir assets estáticos (JS/CSS) y archivos públicos
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    INDEX_HTML = os.path.join(FRONTEND_DIST, 'index.html')

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str, request: Request) -> Response:
        # Si la ruta empieza por api, dejar que FastAPI maneje 404/routers
        if full_path.startswith('api'):
            return Response(status_code=404)

        # Si el archivo solicitado existe en dist (assets públicos: favicon, imágenes, etc.), servirlo
        requested_path = os.path.normpath(os.path.join(FRONTEND_DIST, full_path))
        # Proteger contra path traversal
        if os.path.commonpath([requested_path, FRONTEND_DIST]) == FRONTEND_DIST and os.path.isfile(requested_path):
            return FileResponse(requested_path)

        # Devolver index.html para que el router del frontend gestione la ruta
        return FileResponse(INDEX_HTML)

if __name__ == "__main__":
    import uvicorn
    import os
    import socket
    from contextlib import closing
    # Permitir sobreescribir host/port vía variables de entorno sin editar código
    host = os.getenv("APP_HOST", os.getenv("HOST", app_settings.app_host))
    port = int(os.getenv("APP_PORT", os.getenv("BACKEND_PORT", os.getenv("PORT", str(app_settings.app_port)))))
    def port_in_use(p: int) -> bool:
        """Return True if port is already bound on any interface.
        Instead of connect (which fails for 0.0.0.0), try binding; if bind fails => in use.
        """
        test_host = host
        if host == "0.0.0.0":  # bind test on 0.0.0.0 is correct for detecting use
            test_host = "0.0.0.0"
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            s.bind((test_host, p))
            return False  # Success bind => free
        except OSError:
            return True   # Bind failed => likely in use / permission
        finally:
            try:
                s.close()
            except Exception:
                pass

    original_port = port
    if port_in_use(port):
        print(f"Puerto {port} ocupado. Buscando puerto libre...")
        for candidate in range(port + 1, port + 11):  # probar próximos 10 puertos
            if not port_in_use(candidate):
                print(f"Usando puerto alternativo {candidate} (original {original_port} ocupado)")
                port = candidate
                break
        else:
            print("No se encontró puerto libre en el rango. Aborta.")
            raise SystemExit(1)
    print(f"Iniciando servidor en {host}:{port}")
    uvicorn.run(app, host=host, port=port)
