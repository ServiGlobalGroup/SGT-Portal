"""add compania column to fuel_cards

Revision ID: d30d9ee2f0c8
Revises: 20250912_resources_squash
Create Date: 2025-09-12 13:21:00.447615

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd30d9ee2f0c8'
down_revision: Union[str, None] = '20250912_resources_squash'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add compania column to fuel_cards table
    op.add_column('fuel_cards', sa.Column('compania', sa.String(length=64), nullable=True, comment='Compañía emisora de la tarjeta'))


def downgrade() -> None:
    # Remove compania column from fuel_cards table
    op.drop_column('fuel_cards', 'compania')
