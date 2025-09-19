"""Add compania column back to fuel_cards and via_t_devices

Revision ID: 2025_09_19_add_compania_back_to_resources
Revises: add_company_column
Create Date: 2025-09-19
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '2025_09_19_add_compania_back_to_resources'
down_revision: Union[str, None] = 'add_company_column'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = ['fuel_cards', 'via_t_devices']


def _add_column_if_missing(conn, table: str, column: str):
    dialect = conn.dialect.name
    if dialect == 'postgresql':
        exists = conn.execute(sa.text("""
            SELECT 1 FROM information_schema.columns
            WHERE table_schema='public' AND table_name=:t AND column_name=:c
            LIMIT 1
        """), {"t": table, "c": column}).fetchone()
        if not exists:
            op.add_column(table, sa.Column(column, sa.String(length=64), nullable=True, comment='Compañía emisora'))
    else:
        # SQLite fallback: try add_column; ignore if fails
        try:
            op.add_column(table, sa.Column(column, sa.String(length=64), nullable=True))
        except Exception:
            pass


def upgrade() -> None:
    conn = op.get_bind()
    for t in TABLES:
        _add_column_if_missing(conn, t, 'compania')


def downgrade() -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name
    for t in TABLES:
        # Drop column only if exists (Postgres path)
        if dialect == 'postgresql':
            exists = conn.execute(sa.text("""
                SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name=:t AND column_name='compania'
                LIMIT 1
            """), {"t": t}).fetchone()
            if exists:
                try:
                    op.drop_column(t, 'compania')
                except Exception:
                    pass
        else:
            # SQLite: cannot easily drop column prior to 3.35; skip
            pass
