"""Add route verification fields

Revision ID: add_route_verification
Revises: add_google_routes_cache_cols
Create Date: 2025-08-27 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import func

# revision identifiers, used by Alembic.
revision = 'add_route_verification'
down_revision = 'add_google_routes_cache_cols'
branch_labels = None
depends_on = None


def upgrade():
    # Verificar si las columnas ya existen antes de agregarlas
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_columns = [col['name'] for col in inspector.get_columns('distancieros')]
    
    # Agregar campos de verificación a la tabla distancieros solo si no existen
    if 'verified_at' not in existing_columns:
        op.add_column('distancieros', sa.Column('verified_at', sa.TIMESTAMP(), server_default=func.now(), nullable=True))
    
    if 'created_at' not in existing_columns:
        op.add_column('distancieros', sa.Column('created_at', sa.TIMESTAMP(), server_default=func.now(), nullable=True))
    
    if 'usage_count' not in existing_columns:
        op.add_column('distancieros', sa.Column('usage_count', sa.Integer(), server_default='0', nullable=True))
    
    # Actualizar registros existentes para que tengan los valores por defecto
    op.execute("UPDATE distancieros SET created_at = NOW() WHERE created_at IS NULL")
    op.execute("UPDATE distancieros SET verified_at = NOW() WHERE verified_at IS NULL")
    op.execute("UPDATE distancieros SET usage_count = 0 WHERE usage_count IS NULL")


def downgrade():
    # Eliminar las columnas agregadas
    op.drop_column('distancieros', 'usage_count')
    op.drop_column('distancieros', 'created_at')
    op.drop_column('distancieros', 'verified_at')
