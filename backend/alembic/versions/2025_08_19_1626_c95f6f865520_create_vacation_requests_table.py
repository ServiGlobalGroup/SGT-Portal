"""create vacation requests table

Revision ID: c95f6f865520
Revises: 2025_07_30_migrate_roles
Create Date: 2025-08-19 16:26:59.918294

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c95f6f865520'
down_revision: Union[str, None] = '2025_07_30_migrate_roles'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create vacation status enum
    vacation_status_enum = sa.Enum('pending', 'approved', 'rejected', name='vacationstatus')
    vacation_status_enum.create(op.get_bind())
    
    # Create vacation_requests table
    op.create_table(
        'vacation_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False, comment='ID del usuario que solicita'),
        sa.Column('start_date', sa.DateTime(), nullable=False, comment='Fecha de inicio de vacaciones'),
        sa.Column('end_date', sa.DateTime(), nullable=False, comment='Fecha de fin de vacaciones'),
        sa.Column('reason', sa.Text(), nullable=False, comment='Motivo o descripción de la solicitud'),
        sa.Column('status', vacation_status_enum, nullable=False, server_default='pending', comment='Estado de la solicitud'),
        sa.Column('admin_response', sa.Text(), nullable=True, comment='Comentario del administrador al aprobar/rechazar'),
        sa.Column('reviewed_by', sa.Integer(), nullable=True, comment='ID del administrador que revisó'),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True, comment='Fecha de revisión por parte del admin'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Fecha de creación'),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Fecha de última actualización'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_vacation_requests_user_id', 'user_id'),
        sa.Index('ix_vacation_requests_id', 'id')
    )


def downgrade() -> None:
    op.drop_table('vacation_requests')
    
    # Drop vacation status enum
    vacation_status_enum = sa.Enum('pending', 'approved', 'rejected', name='vacationstatus')
    vacation_status_enum.drop(op.get_bind())
