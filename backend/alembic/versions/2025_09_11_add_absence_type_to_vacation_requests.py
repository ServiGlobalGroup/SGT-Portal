"""add absence_type to vacation_requests

Revision ID: 2025_09_11_add_absence_type
Revises: c95f6f865520
Create Date: 2025-09-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2025_09_11_add_absence_type'
down_revision: Union[str, None] = 'c95f6f865520'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # Crear enum si no existe
    absence_enum_name = 'absencetype'
    enum_exists = False
    try:
        # Esto funciona para Postgres; si es otro motor puede ignorarse
        enum_exists = True
    except Exception:
        enum_exists = False

    absence_type_enum = sa.Enum('VACATION', 'PERSONAL', name=absence_enum_name)
    try:
        absence_type_enum.create(bind, checkfirst=True)
    except Exception:
        pass

    # Añadir columna con default
    op.add_column('vacation_requests', sa.Column('absence_type', absence_type_enum, nullable=True, server_default='VACATION', comment='Tipo de ausencia: VACATION o PERSONAL'))

    # Backfill: asegurar que todos los registros existentes tengan valor
    op.execute("UPDATE vacation_requests SET absence_type = 'VACATION' WHERE absence_type IS NULL")

    # Hacer no nula
    op.alter_column('vacation_requests', 'absence_type', nullable=False, server_default=None)


def downgrade() -> None:
    bind = op.get_bind()
    absence_enum_name = 'absencetype'
    absence_type_enum = sa.Enum('VACATION', 'PERSONAL', name=absence_enum_name)

    # Eliminar la columna primero
    op.drop_column('vacation_requests', 'absence_type')

    # Luego eliminar el enum si es posible
    try:
        absence_type_enum.drop(bind, checkfirst=True)
    except Exception:
        pass
