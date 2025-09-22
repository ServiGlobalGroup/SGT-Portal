"""Ensure P_TALLER role exists in userrole enum

Revision ID: 2025_09_22_ensure_p_taller_role_enum
Revises: 646ece2b96b6
Create Date: 2025-09-22
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '2025_09_22_ensure_p_taller_role_enum'
down_revision = '646ece2b96b6'
branch_labels = None
depends_on = None


def upgrade():
    # Idempotente: solo añade el valor si no existe
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'P_TALLER'")


def downgrade():
    # No se elimina el valor por simplicidad (revertir enum es costoso)
    pass
