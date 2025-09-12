"""Squash: crear tablas fuel_cards y via_t_devices (unificada)

Revision ID: 20250912_resources_squash
Revises: 20250908_admin_role, 2025_09_11_add_absence_type
Create Date: 2025-09-12

Motivo:
Se unifican las migraciones previas relacionadas con resources:
 - 2025_09_11_add_resources_tables
 - merge_res_admin_20250912 (merge sin cambios)
 - fix_resources_tables_20250912 (idempotente)

Para producción sólo se aplicará esta migración después de que existan las revisiones
"20250908_admin_role" y "2025_09_11_add_absence_type". En entornos donde ya se
aplicaron las anteriores, NO ejecutar esta (o hacer stamp manual) para evitar duplicados.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision: str = '20250912_resources_squash'
down_revision: Union[str, Sequence[str], None] = ('20250908_admin_role', '2025_09_11_add_absence_type')
branch_labels = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing = set(inspector.get_table_names())

    if 'fuel_cards' not in existing:
        op.create_table(
            'fuel_cards',
            sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
            sa.Column('pan', sa.String(length=64), nullable=False, index=True, comment='PAN de la tarjeta (número enmascarable)'),
            sa.Column('matricula', sa.String(length=16), nullable=False, index=True, comment='Matrícula asociada'),
            sa.Column('caducidad', sa.Date(), nullable=True, comment='Fecha de caducidad de la tarjeta'),
            sa.Column('pin', sa.String(length=32), nullable=False, comment='PIN de la tarjeta (considerar cifrado)'),
            sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True, index=True, comment='Usuario que creó el registro'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Fecha de creación'),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Última actualización'),
        )

    if 'via_t_devices' not in existing:
        op.create_table(
            'via_t_devices',
            sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
            sa.Column('numero_telepeaje', sa.String(length=64), nullable=False, index=True, comment='Número de telepeaje del dispositivo'),
            sa.Column('pan', sa.String(length=64), nullable=False, index=True, comment='PAN asociado al dispositivo Via T'),
            sa.Column('compania', sa.String(length=64), nullable=True, comment='Compañía emisora'),
            sa.Column('matricula', sa.String(length=16), nullable=False, index=True, comment='Matrícula asociada'),
            sa.Column('caducidad', sa.Date(), nullable=True, comment='Fecha de caducidad'),
            sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True, index=True, comment='Usuario que creó el registro'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Fecha de creación'),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Última actualización'),
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing = set(inspector.get_table_names())
    if 'via_t_devices' in existing:
        op.drop_table('via_t_devices')
    if 'fuel_cards' in existing:
        op.drop_table('fuel_cards')
