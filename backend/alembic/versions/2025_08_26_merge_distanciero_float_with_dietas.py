"""Merge heads distanciero float and previous merge

Revision ID: merge_distanciero_float_with_dietas_20250826
Revises: change_distanciero_km_float_20250826
Create Date: 2025-08-26 00:10:00.000000
"""
from typing import Sequence, Union
from alembic import op  # noqa: F401
import sqlalchemy as sa  # noqa: F401

revision: str = 'merge_distanciero_float_with_dietas_20250826'
down_revision: Union[str, None] = 'change_distanciero_km_float_20250826'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:  # pragma: no cover
    pass


def downgrade() -> None:  # pragma: no cover
    pass
