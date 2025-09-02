"""migrate roles to new structure

Revision ID: 2025_07_30_migrate_roles
Revises: a946082cf036
Create Date: 2025-07-30 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '2025_07_30_migrate_roles'
down_revision = 'a946082cf036'
branch_labels = None
depends_on = None

def upgrade():
    """Migrar roles de ADMIN/MANAGER/EMPLOYEE a ADMINISTRADOR/TRAFICO/TRABAJADOR"""
    
    # Primero, agregar los nuevos valores al enum
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'ADMINISTRADOR'")
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'TRAFICO'")  
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'TRABAJADOR'")
    
    # Migrar datos existentes
    op.execute("UPDATE users SET role = 'ADMINISTRADOR' WHERE role = 'ADMIN'")
    op.execute("UPDATE users SET role = 'TRAFICO' WHERE role = 'MANAGER'")
    op.execute("UPDATE users SET role = 'TRABAJADOR' WHERE role = 'EMPLOYEE'")
    
    # Nota: Los valores antiguos del enum no se pueden eliminar directamente en PostgreSQL
    # Se mantendrán para compatibilidad, pero los nuevos registros usarán los nuevos valores

def downgrade():
    """Revertir migración de roles"""
    
    # Revertir datos 
    op.execute("UPDATE users SET role = 'ADMIN' WHERE role = 'ADMINISTRADOR'")
    op.execute("UPDATE users SET role = 'MANAGER' WHERE role = 'TRAFICO'")
    op.execute("UPDATE users SET role = 'EMPLOYEE' WHERE role = 'TRABAJADOR'")
