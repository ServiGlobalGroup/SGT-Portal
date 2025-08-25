"""merge dietas heads

Revision ID: merge_dietas_heads_20250822
Revises: add_dietas_table_20250822, expand_month_full_date_20250822
Create Date: 2025-08-22 18:05:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'merge_dietas_heads_20250822'
down_revision: Union[str, tuple[str, str]] = (
    'add_dietas_table_20250822', 'expand_month_full_date_20250822'
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # No structural changes; this merges branches.
    pass


def downgrade() -> None:
    # Cannot unmerge safely.
    pass
