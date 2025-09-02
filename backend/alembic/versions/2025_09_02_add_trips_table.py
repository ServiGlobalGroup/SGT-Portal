"""add trips table

Revision ID: add_trips_table_20250902
Revises: add_dietas_table_20250822
Create Date: 2025-09-02
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_trips_table_20250902'
down_revision = 'add_dietas_table_20250822'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'trips',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('order_number', sa.String(length=100), nullable=False),
        sa.Column('pernocta', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('festivo', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('event_date', sa.Date(), nullable=False),
        sa.Column('note', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_trips_user_id', 'trips', ['user_id'])
    op.create_index('ix_trips_order_number', 'trips', ['order_number'])
    op.create_index('ix_trips_event_date', 'trips', ['event_date'])


def downgrade():
    op.drop_index('ix_trips_user_id', table_name='trips')
    op.drop_index('ix_trips_order_number', table_name='trips')
    op.drop_index('ix_trips_event_date', table_name='trips')
    op.drop_table('trips')
