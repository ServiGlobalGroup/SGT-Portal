"""create activity_log table

Revision ID: activity_log_20250822
Revises: add_worker_type_20250822
Create Date: 2025-08-22
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'activity_log_20250822'
down_revision = 'add_worker_type_20250822'
branch_labels = None
depends_on = None

def upgrade():
    if not op.get_bind().dialect.has_table(op.get_bind(), 'activity_log'):  # type: ignore
        op.create_table(
            'activity_log',
            sa.Column('id', sa.Integer, primary_key=True),
            sa.Column('user_name', sa.String(length=200), nullable=False),
            sa.Column('action', sa.String(length=500), nullable=False),
            sa.Column('type', sa.String(length=50), nullable=False, server_default='update'),
            sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False)
        )
        op.create_index('ix_activity_log_id', 'activity_log', ['id'])


def downgrade():
    op.drop_index('ix_activity_log_id', table_name='activity_log')
    op.drop_table('activity_log')
