"""Add status column to users table

Revision ID: b1b2f361586c
Revises: 25e450664fa8
Create Date: 2025-09-15 10:11:27.386921

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b1b2f361586c'
down_revision: Union[str, None] = '25e450664fa8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add status column to users table
    op.add_column('users', sa.Column('status', sa.Enum('activo', 'inactivo', 'baja', name='userstatus'), nullable=True, comment='Estado del usuario'))
    
    # Migrate data from is_active to status
    connection = op.get_bind()
    connection.execute(sa.text("""
        UPDATE users 
        SET status = CASE 
            WHEN is_active = true THEN 'activo'::userstatus
            ELSE 'inactivo'::userstatus
        END
    """))
    
    # Make status column non-nullable now that it has data
    op.alter_column('users', 'status', nullable=False)
    
    # Drop is_active column
    op.drop_column('users', 'is_active')


def downgrade() -> None:
    # Add is_active column back
    op.add_column('users', sa.Column('is_active', sa.BOOLEAN(), server_default=sa.text('true'), autoincrement=False, nullable=True))
    
    # Migrate data from status back to is_active
    connection = op.get_bind()
    connection.execute(sa.text("""
        UPDATE users 
        SET is_active = CASE 
            WHEN status = 'activo' THEN true
            ELSE false
        END
    """))
    
    # Make is_active non-nullable
    op.alter_column('users', 'is_active', nullable=False)
    
    # Drop status column
    op.drop_column('users', 'status')
