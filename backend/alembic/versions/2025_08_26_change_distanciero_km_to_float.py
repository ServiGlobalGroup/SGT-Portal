"""Change distancieros.km from Integer to Float

Revision ID: change_distanciero_km_float_20250826
Revises: expand_month_full_date_20250822
Create Date: 2025-08-26 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'change_distanciero_km_float_20250826'
down_revision: Union[str, None] = 'merge_dietas_heads_20250822'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Usar batch para compatibilidad
    with op.batch_alter_table('distancieros', schema=None) as batch_op:
        batch_op.alter_column('km', existing_type=sa.Integer(), type_=sa.Float(), existing_nullable=False)


def downgrade() -> None:
    # Intentar convertir a int truncando; dependerá del motor si lo permite automáticamente
    with op.batch_alter_table('distancieros', schema=None) as batch_op:
        batch_op.alter_column('km', existing_type=sa.Float(), type_=sa.Integer(), existing_nullable=False)
