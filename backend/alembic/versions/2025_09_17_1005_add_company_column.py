"""Add company enum and column to multiple tables

Revision ID: add_company_column
Revises: 6b05bed61a4a
Create Date: 2025-09-17 10:05:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'add_company_column'
down_revision: Union[str, None] = '6b05bed61a4a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


COMPANY_TYPE_NAME = 'company'
COMPANY_VALUES = ('SERVIGLOBAL', 'EMATRA')

def _create_enum_if_not_exists(connection, enum_name: str, values: tuple[str, ...]):
    exists = connection.execute(sa.text(
        """
        SELECT 1 FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = :name
        LIMIT 1
        """
    ), {"name": enum_name}).fetchone()
    if not exists:
        connection.execute(sa.text(
            "CREATE TYPE {name} AS ENUM ({vals})".format(
                name=enum_name,
                vals=", ".join([f"'{v}'" for v in values])
            )
        ))


def upgrade() -> None:
    connection = op.get_bind()
    dialect = connection.dialect.name

    tables = ['activity_log', 'dietas', 'trips', 'upload_history', 'users', 'vacation_requests']
    if dialect == 'postgresql':
        # 1) Crear tipo ENUM si no existe
        _create_enum_if_not_exists(connection, COMPANY_TYPE_NAME, COMPANY_VALUES)

        # 2) Agregar columna company a las tablas solicitadas (si no existe)
        for table in tables:
            res = connection.execute(sa.text(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name=:table AND column_name='company'
                """
            ), {"table": table}).fetchone()
            if not res:
                op.add_column(
                    table,
                    sa.Column(
                        'company',
                        sa.Enum(*COMPANY_VALUES, name=COMPANY_TYPE_NAME),
                        nullable=True,
                        comment='Empresa asociada: SERVIGLOBAL o EMATRA'
                    )
                )
    else:
        # Otros dialectos (p.ej. SQLite de desarrollo): usar String simple como fallback
        for table in tables:
            # No todos los dialectos exponen information_schema; intentar un add_column directo dentro de try/catch
            try:
                op.add_column(
                    table,
                    sa.Column('company', sa.String(length=20), nullable=True, comment='Empresa asociada: SERVIGLOBAL o EMATRA')
                )
            except Exception:
                # Si ya existe, ignorar
                pass


def downgrade() -> None:
    connection = op.get_bind()
    dialect = connection.dialect.name
    tables = ['activity_log', 'dietas', 'trips', 'upload_history', 'users', 'vacation_requests']
    if dialect == 'postgresql':
        # 1) Quitar columnas (si existen)
        for table in tables:
            res = connection.execute(sa.text(
                """
                SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name=:table AND column_name='company'
                """
            ), {"table": table}).fetchone()
            if res:
                op.drop_column(table, 'company')
    else:
        for table in tables:
            try:
                op.drop_column(table, 'company')
            except Exception:
                pass

    # 2) No borrar el tipo ENUM si pudiera estar en uso por otras migraciones
    # Si se desea borrar, descomentar el siguiente bloque:
    # connection.execute(sa.text("DROP TYPE IF EXISTS company"))
