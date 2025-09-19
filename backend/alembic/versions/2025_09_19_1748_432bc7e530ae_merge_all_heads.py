"""merge_all_heads

Revision ID: 432bc7e530ae
Revises: 8c0d8a9f1c2b, 646ece2b96b6, 2025_09_19_add_compania_back_to_resources
Create Date: 2025-09-19 17:48:45.126735

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '432bc7e530ae'
down_revision: Union[str, None] = ('8c0d8a9f1c2b', '646ece2b96b6', 'add_compania_back')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
