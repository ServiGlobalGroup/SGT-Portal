"""merge heads

Revision ID: 76b8226deea8
Revises: 2025_09_11_add_resources_tables, b1b2f361586c, 2025_09_15_add_user_status
Create Date: 2025-09-15 17:48:05.907196

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '76b8226deea8'
down_revision: Union[str, None] = ('2025_09_11_add_resources_tables', 'b1b2f361586c', '2025_09_15_add_user_status')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
