"""final_merge_all_heads

Revision ID: 66bd53a2dcf1
Revises: 432bc7e530ae, 4383c317ff51
Create Date: 2025-10-01 18:40:38.716618

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '66bd53a2dcf1'
down_revision: Union[str, None] = ('432bc7e530ae', '4383c317ff51')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
