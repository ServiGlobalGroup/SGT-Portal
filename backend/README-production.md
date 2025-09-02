Guía rápida de preparación para producción (Backend)

1) Variables de entorno requeridas (.env)
- DATABASE_URL
- SECRET_KEY
- MASTER_ADMIN_PASSWORD
- USER_FILES_BASE_PATH (por defecto ../user_files)
- TRAFFIC_FILES_BASE_PATH (por defecto ../traffic_files)
- ALLOWED_ORIGINS como lista separada por comas (opcional)

2) CORS configurable
El backend lee allowed_origins desde Settings (app/config.py). Ajusta ALLOWED_ORIGINS en .env para tu dominio.

3) Modo mantenimiento
- Se usa maintenance_status.json en la raíz de backend. Asegura permisos de escritura.

4) Datos y subidas
- Los directorios user_files/, traffic_files/ y backend/files/ no deberían empaquetarse dentro de la imagen. Móntalos como volúmenes.

5) Limpieza segura
- Ejecuta dry-run:
  python backend/scripts/cleanup_backend.py
- Aplicar cambios (mover a backend/.trash):
  python backend/scripts/cleanup_backend.py --apply
- Restaurar último lote:
  python backend/scripts/cleanup_backend.py --restore

6) Alembic y migraciones
- Si la DB de producción ya está provisionada, puedes excluir alembic/ y alembic.ini. Si usas migraciones en runtime, mantenlos.

7) Docker
- .dockerignore creado para reducir tamaño de imagen.
