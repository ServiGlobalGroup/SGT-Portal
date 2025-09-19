"""Add required compania column to resource tables

Revision ID: 8c0d8a9f1c2b
Revises: add_company_column
Create Date: 2025-09-19
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '8c0d8a9f1c2b'
down_revision: Union[str, None] = 'add_company_column'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = ['fuel_cards', 'via_t_devices']


def upgrade() -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name
    for t in TABLES:
        # 1. Add column if missing (nullable first)
        if dialect == 'postgresql':
            exists = conn.execute(sa.text("""
                SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name=:t AND column_name='compania'
            """), {"t": t}).fetchone()
            if not exists:
                op.add_column(t, sa.Column('compania', sa.String(length=64), nullable=True, comment='Compañía emisora'))
        else:
            try:
                op.add_column(t, sa.Column('compania', sa.String(length=64), nullable=True))
            except Exception:
                pass
        # 2. Set existing rows to '' where NULL
        try:
            op.execute(sa.text(f"UPDATE {t} SET compania='' WHERE compania IS NULL"))
        except Exception:
            pass
        # 3. Alter to NOT NULL (only Postgres)
        if dialect == 'postgresql':
            try:
                op.alter_column(t, 'compania', existing_type=sa.String(length=64), nullable=False)
            except Exception:
                pass


def downgrade() -> None:
    # Make column nullable again instead of dropping (safer for rollbacks)
    conn = op.get_bind()
    dialect = conn.dialect.name
    if dialect == 'postgresql':
        for t in TABLES:
            try:
                op.alter_column(t, 'compania', existing_type=sa.String(length=64), nullable=True)
            except Exception:
                pass
