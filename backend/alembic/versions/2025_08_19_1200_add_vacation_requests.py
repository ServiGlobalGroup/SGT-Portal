"""create_vacation_requests_table

Revision ID: add_vacation_requests
Revises: a946082cf036
Create Date: 2025-08-19 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision = 'add_vacation_requests'
down_revision = 'a946082cf036'
branch_labels = None
depends_on = None

def upgrade():
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

def downgrade():
    op.drop_table('vacation_requests')
    
    # Drop vacation status enum
    vacation_status_enum = sa.Enum('pending', 'approved', 'rejected', name='vacationstatus')
    vacation_status_enum.drop(op.get_bind())
