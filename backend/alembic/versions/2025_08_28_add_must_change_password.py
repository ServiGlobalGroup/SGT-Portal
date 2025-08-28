from alembic import op
import sqlalchemy as sa

# Revisar y ajustar estos identificadores si se usa un patrón distinto
revision = '28_add_must_change_password'
down_revision = '6514172f5050'  # merge verification and tolls columns
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('must_change_password', sa.Boolean(), server_default='0', nullable=False))


def downgrade():
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('must_change_password')
