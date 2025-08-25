"""add dietas table

Revision ID: add_dietas_table_20250822
Revises: activity_log_20250822
Create Date: 2025-08-22
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_dietas_table_20250822'
down_revision = 'activity_log_20250822'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'dietas',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('worker_type', sa.String(length=10), nullable=False, server_default='antiguo'),
        sa.Column('order_number', sa.String(length=100), nullable=True),
    # Se crea ya con longitud 10 (YYYY-MM-DD) aunque down_revision histórica tenía 7
    sa.Column('month', sa.String(length=10), nullable=False),
        sa.Column('total_amount', sa.Numeric(10,2), nullable=False),
        sa.Column('concepts', sa.JSON(), nullable=False),
        sa.Column('notes', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    # Crear índices (nombres únicos)
    op.create_index('ix_dietas_user_id', 'dietas', ['user_id'])
    op.create_index('ix_dietas_month', 'dietas', ['month'])

def downgrade():
    op.drop_index('ix_dietas_user_id', table_name='dietas')
    op.drop_index('ix_dietas_month', table_name='dietas')
    op.drop_table('dietas')