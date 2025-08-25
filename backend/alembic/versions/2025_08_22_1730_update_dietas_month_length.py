"""Expand dietas.month column to store full date (YYYY-MM-DD)

Revision ID: expand_month_full_date_20250822
Revises: activity_log_20250822
Create Date: 2025-08-22 17:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'expand_month_full_date_20250822'
down_revision: Union[str, None] = 'activity_log_20250822'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    cols = {c['name']: c for c in insp.get_columns('dietas')}
    existing = cols.get('month')
    # Solo alterar si la longitud previa era 7
    with op.batch_alter_table('dietas', schema=None) as batch_op:
        if existing and isinstance(existing['type'], sa.String) and getattr(existing['type'], 'length', None) == 7:
            batch_op.alter_column('month',
                                  existing_type=sa.String(length=7),
                                  type_=sa.String(length=10),
                                  existing_nullable=existing.get('nullable', True))


def downgrade() -> None:
    # Downgrade opcional: sólo si era 10
    conn = op.get_bind()
    insp = sa.inspect(conn)
    cols = {c['name']: c for c in insp.get_columns('dietas')}
    existing = cols.get('month')
    with op.batch_alter_table('dietas', schema=None) as batch_op:
        if existing and isinstance(existing['type'], sa.String) and getattr(existing['type'], 'length', None) == 10:
            batch_op.alter_column('month',
                                  existing_type=sa.String(length=10),
                                  type_=sa.String(length=7),
                                  existing_nullable=existing.get('nullable', True))
