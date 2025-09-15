"""Add user status enum and migrate from is_active

Revision ID: 25e450664fa8
Revises: d30d9ee2f0c8
Create Date: 2025-09-15 09:43:28.602554

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '25e450664fa8'
down_revision: Union[str, None] = 'd30d9ee2f0c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Crear el nuevo enum UserStatus
    user_status_enum = sa.Enum('ACTIVO', 'INACTIVO', 'BAJA', name='userstatus')
    user_status_enum.create(op.get_bind())
    
    # Agregar la nueva columna status con default ACTIVO
    op.add_column('users', sa.Column('status', user_status_enum, nullable=False, server_default='ACTIVO'))
    
    # Migrar datos: convertir is_active boolean a status enum
    # is_active = true -> ACTIVO
    # is_active = false -> INACTIVO
    connection = op.get_bind()
    connection.execute(sa.text("""
        UPDATE users 
        SET status = CASE 
            WHEN is_active = true THEN 'ACTIVO'::userstatus
            ELSE 'INACTIVO'::userstatus
        END
    """))
    
    # Eliminar la columna is_active (ya no necesaria)
    op.drop_column('users', 'is_active')


def downgrade() -> None:
    # Re-agregar la columna is_active
    op.add_column('users', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))
    
    # Migrar datos de vuelta: status enum a is_active boolean
    # ACTIVO y BAJA -> true (ambos pueden hacer login)
    # INACTIVO -> false
    connection = op.get_bind()
    connection.execute(sa.text("""
        UPDATE users 
        SET is_active = CASE 
            WHEN status IN ('ACTIVO', 'BAJA') THEN true
            ELSE false
        END
    """))
    
    # Eliminar la columna status
    op.drop_column('users', 'status')
    
    # Eliminar el enum UserStatus
    op.execute('DROP TYPE userstatus')
