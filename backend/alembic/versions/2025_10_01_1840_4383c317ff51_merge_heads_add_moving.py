"""merge_heads_add_moving

Revision ID: 4383c317ff51
Revises: 74d9478ead70, 2025_10_01_add_moving
Create Date: 2025-10-01 18:40:07.840004

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4383c317ff51'
down_revision: Union[str, None] = ('74d9478ead70', '2025_10_01_add_moving')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
