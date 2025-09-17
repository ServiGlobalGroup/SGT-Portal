"""remove companies table and all company-related columns

Revision ID: 6b05bed61a4a
Revises: 1e76b9720c43
Create Date: 2025-09-17 09:27:15.028578

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6b05bed61a4a'
down_revision: Union[str, None] = '1e76b9720c43'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove company_id columns from all tables that have them
    # Use raw SQL with IF EXISTS to avoid errors if columns don't exist
    from alembic import op
    import sqlalchemy as sa
    
    # Check if company_id columns exist and drop them
    connection = op.get_bind()
    
    tables_with_company_id = [
        'activity_log', 'dietas', 'trips', 'upload_history', 'users', 'vacation_requests'
    ]
    
    for table in tables_with_company_id:
        # Check if column exists before dropping
        result = connection.execute(sa.text(f"""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='{table}' AND column_name='company_id' AND table_schema='public'
        """))
        if result.fetchone():
            op.drop_column(table, 'company_id')
    
    # Check and drop compania columns from resource tables
    resource_tables = [
        ('fuel_cards', 'compania'),
        ('via_t_devices', 'compania')
    ]
    
    for table, column in resource_tables:
        result = connection.execute(sa.text(f"""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='{table}' AND column_name='{column}' AND table_schema='public'
        """))
        if result.fetchone():
            op.drop_column(table, column)
    
    # Check if companies table exists and drop it
    result = connection.execute(sa.text("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name='companies' AND table_schema='public'
    """))
    if result.fetchone():
        op.drop_table('companies')


def downgrade() -> None:
    # Recreate companies table
    op.create_table('companies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('short_name', sa.String(), nullable=True),
        sa.Column('cif_nif', sa.String(), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('city', sa.String(), nullable=True),
        sa.Column('postal_code', sa.String(), nullable=True),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('settings', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Add back company_id columns to all tables
    op.add_column('activity_log', sa.Column('company_id', sa.Integer(), nullable=True))
    op.add_column('dietas', sa.Column('company_id', sa.Integer(), nullable=True))
    op.add_column('trips', sa.Column('company_id', sa.Integer(), nullable=True))
    op.add_column('upload_history', sa.Column('company_id', sa.Integer(), nullable=True))
    op.add_column('users', sa.Column('company_id', sa.Integer(), nullable=True))
    op.add_column('vacation_requests', sa.Column('company_id', sa.Integer(), nullable=True))
    
    # Add back compania columns to resource tables
    op.add_column('fuel_cards', sa.Column('compania', sa.String(length=64), nullable=True, comment='Compañía emisora de la tarjeta'))
    op.add_column('via_t_devices', sa.Column('compania', sa.String(length=64), nullable=True, comment='Compañía emisora'))
