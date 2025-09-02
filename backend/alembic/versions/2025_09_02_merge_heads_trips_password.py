"""Merge heads for trips and must_change_password

Revision ID: merge_trips_password_20250902
Revises: add_trips_table_20250902,28_add_must_change_password
Create Date: 2025-09-02
"""
from alembic import op
import sqlalchemy as sa  # noqa: F401

revision = 'merge_trips_password_20250902'
down_revision = ('add_trips_table_20250902', '28_add_must_change_password')
branch_labels = None
depends_on = None

def upgrade():
    # No cambios: solo merge de ramas
    pass

def downgrade():
    # Revertir merge no aplica cambios de esquema.
    pass
