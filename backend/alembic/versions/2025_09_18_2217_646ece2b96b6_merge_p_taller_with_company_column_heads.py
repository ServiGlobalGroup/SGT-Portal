"""merge p_taller with company column heads

Revision ID: 646ece2b96b6
Revises: 2025_09_18_add_role_p_taller, add_company_column
Create Date: 2025-09-18 22:17:55.410359

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '646ece2b96b6'
down_revision: Union[str, None] = ('2025_09_18_add_role_p_taller', 'add_company_column')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
