"""add worker_type column to users

Revision ID: add_worker_type_20250822
Revises: c95f6f865520
Create Date: 2025-08-22
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_worker_type_20250822'
down_revision = 'c95f6f865520'
branch_labels = None
depends_on = None


def upgrade():
    # Añadir columna con valor por defecto 'antiguo'
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('worker_type', sa.String(length=10), nullable=False, server_default='antiguo'))


def downgrade():
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('worker_type')
