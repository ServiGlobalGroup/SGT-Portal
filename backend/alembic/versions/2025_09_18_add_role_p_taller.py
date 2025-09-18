"""Add P_TALLER role to userrole enum

Revision ID: 2025_09_18_add_role_p_taller
Revises: 2025_09_08_add_role_administracion
Create Date: 2025-09-18
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '2025_09_18_add_role_p_taller'
down_revision = '2025_09_08_add_role_administracion'
branch_labels = None
depends_on = None


def upgrade():
    # PostgreSQL: add new value to enum type if not exists
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'P_TALLER'")


def downgrade():
    # Can't easily drop enum values in PostgreSQL without complex steps.
    # Leaving as no-op to avoid breaking existing data.
    pass