"""Add uses_tolls column to distancieros

Revision ID: add_uses_tolls_20250827
Revises: add_google_routes_cache_cols
Create Date: 2025-08-27 12:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'add_uses_tolls_20250827'
down_revision: Union[str, None] = 'add_google_routes_cache_cols'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    with op.batch_alter_table('distancieros', schema=None) as batch_op:
        batch_op.add_column(sa.Column('uses_tolls', sa.Boolean(), nullable=True))
        batch_op.create_index('ix_distancieros_uses_tolls', ['uses_tolls'])


def downgrade() -> None:
    with op.batch_alter_table('distancieros', schema=None) as batch_op:
        batch_op.drop_index('ix_distancieros_uses_tolls')
        batch_op.drop_column('uses_tolls')
