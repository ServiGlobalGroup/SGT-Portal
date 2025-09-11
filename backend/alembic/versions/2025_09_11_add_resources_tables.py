"""create fuel_cards and via_t_devices tables

Revision ID: 2025_09_11_add_resources_tables
Revises: 2025_09_11_add_absence_type_to_vacation_requests
Create Date: 2025-09-11
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2025_09_11_add_resources_tables'
down_revision: Union[str, None] = '2025_09_11_add_absence_type_to_vacation_requests'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Crear tablas para recursos: tarjetas de gasoil y dispositivos Via T.

    fuel_cards: almacena tarjetas de combustible (PAN, matrícula, fecha caducidad, PIN en texto plano inicial – se recomienda cifrar en futuras revisiones).
    via_t_devices: dispositivos de telepeaje (número telepeaje, PAN, compañía, matrícula, fecha caducidad).
    """
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
        sa.Index('ix_fuel_cards_pan', 'pan'),
        sa.Index('ix_fuel_cards_matricula', 'matricula'),
    )

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
        sa.Index('ix_via_t_devices_numero_telepeaje', 'numero_telepeaje'),
        sa.Index('ix_via_t_devices_pan', 'pan'),
        sa.Index('ix_via_t_devices_matricula', 'matricula'),
    )

    # Constraints únicas opcionales (descomentar si se decide que no pueden duplicarse)
    # op.create_unique_constraint('uq_fuel_cards_pan', 'fuel_cards', ['pan'])
    # op.create_unique_constraint('uq_via_t_devices_numero_telepeaje', 'via_t_devices', ['numero_telepeaje'])


def downgrade() -> None:
    op.drop_table('via_t_devices')
    op.drop_table('fuel_cards')
