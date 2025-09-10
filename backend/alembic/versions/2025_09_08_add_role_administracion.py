"""Add ADMINISTRACION role to userrole enum

Revision ID: 2025_09_08_add_role_administracion
Revises: merge_trips_password_20250902
Create Date: 2025-09-08
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '2025_09_08_add_role_administracion'
down_revision = 'merge_trips_password_20250902'
branch_labels = None
depends_on = None


def upgrade():
    # PostgreSQL: add new value to enum type if not exists
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'ADMINISTRACION'")


def downgrade():
    # Can't easily drop enum values in PostgreSQL without complex steps.
    # Leaving as no-op to avoid breaking existing data.
    pass
