"""Add user status enum and column

Revision ID: 2025_09_15_add_user_status
Revises: 2025_09_08_add_role_administracion
Create Date: 2025-09-15

Agrega un campo status enum para los usuarios que permite estados:
- ACTIVO: Usuario activo normal
- INACTIVO: Usuario desactivado (no puede hacer login)
- BAJA: Usuario de baja (puede hacer login pero no se cuenta como conductor disponible)
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '2025_09_15_add_user_status'
down_revision = '2025_09_08_add_role_administracion'
branch_labels = None
depends_on = None


def upgrade():
    # Crear el enum UserStatus
    op.execute("CREATE TYPE userstatus AS ENUM ('ACTIVO', 'INACTIVO', 'BAJA')")
    
    # Agregar la columna status con valor por defecto ACTIVO
    op.execute("ALTER TABLE users ADD COLUMN status userstatus NOT NULL DEFAULT 'ACTIVO'")
    
    # Migrar datos existentes: mapear is_active a status
    op.execute("""
        UPDATE users 
        SET status = CASE 
            WHEN is_active = true THEN 'ACTIVO'::userstatus 
            ELSE 'INACTIVO'::userstatus 
        END
    """)


def downgrade():
    # Eliminar la columna status
    op.execute("ALTER TABLE users DROP COLUMN status")
    
    # Eliminar el enum
    op.execute("DROP TYPE userstatus")