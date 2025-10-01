"""add MOVING to absence_type enum

Revision ID: 2025_10_01_add_moving
Revises: 0ffe0a087dbe
Create Date: 2025-10-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2025_10_01_add_moving'
down_revision: Union[str, None] = '0ffe0a087dbe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Para PostgreSQL, añadimos el nuevo valor MOVING al enum existente
    bind = op.get_bind()
    
    # Verificar si ya existe el valor MOVING
    result = bind.execute(sa.text(
        "SELECT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MOVING' AND enumtypid = "
        "(SELECT oid FROM pg_type WHERE typname = 'absencetype'))"
    ))
    exists = result.scalar()
    
    if not exists:
        # Añadir MOVING al enum
        bind.execute(sa.text("ALTER TYPE absencetype ADD VALUE 'MOVING'"))


def downgrade() -> None:
    # PostgreSQL no soporta eliminar valores de enum fácilmente
    # Para un downgrade completo sería necesario recrear el enum
    # En producción, es mejor mantener el valor MOVING aunque no se use
    pass
