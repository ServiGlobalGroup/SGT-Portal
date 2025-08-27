"""Add Google Maps cache columns to distancieros

Revision ID: add_google_routes_cache_cols_20250827
Revises: change_distanciero_km_float_20250826
Create Date: 2025-08-27 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'add_google_routes_cache_cols'
down_revision: Union[str, None] = 'merge_distanciero_float_with_dietas_20250826'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('distancieros', schema=None) as batch_op:
        batch_op.add_column(sa.Column('origin', sa.String(length=200), nullable=True))
        batch_op.add_column(sa.Column('origin_normalized', sa.String(length=220), nullable=True))
        batch_op.add_column(sa.Column('mode', sa.String(length=30), nullable=True))
        batch_op.add_column(sa.Column('duration_sec', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('polyline', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('hash_key', sa.String(length=300), nullable=True))
        batch_op.create_index('ix_distancieros_origin_normalized', ['origin_normalized'])
        batch_op.create_index('ix_distancieros_hash_key', ['hash_key'], unique=True)


def downgrade() -> None:
    with op.batch_alter_table('distancieros', schema=None) as batch_op:
        batch_op.drop_index('ix_distancieros_hash_key')
        batch_op.drop_index('ix_distancieros_origin_normalized')
        batch_op.drop_column('hash_key')
        batch_op.drop_column('polyline')
        batch_op.drop_column('duration_sec')
        batch_op.drop_column('mode')
        batch_op.drop_column('origin_normalized')
        batch_op.drop_column('origin')
