"""Merge heads before truck inspections

Revision ID: 0ffe0a087dbe
Revises: 2025_09_22_ensure_p_taller_role_enum
Create Date: 2025-09-26 14:34:09.011666

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0ffe0a087dbe'
down_revision: Union[str, None] = '2025_09_22_ensure_p_taller_role_enum'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
