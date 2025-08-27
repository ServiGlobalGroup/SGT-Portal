"""Merge verification and tolls columns

Revision ID: 6514172f5050
Revises: add_route_verification, add_uses_tolls_20250827
Create Date: 2025-08-27 15:43:25.490855

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6514172f5050'
down_revision: Union[str, None] = ('add_route_verification', 'add_uses_tolls_20250827')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
