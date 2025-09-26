"""Add complete truck inspections system

This migration creates the full truck inspection system including:
- truck_inspections table with all components and fields
- truck_inspection_requests table for manual requests
- Associated indexes and foreign keys

Revision ID: 2025_09_25_truck_inspections_complete  
Revises: 432bc7e530ae
Create Date: 2025-09-25 16:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "2025_09_25_truck_inspections_complete"
down_revision: Union[str, None] = "432bc7e530ae" 
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TRUCK_INSPECTIONS = "truck_inspections"
TRUCK_INSPECTION_REQUESTS = "truck_inspection_requests"
REQUEST_STATUS_ENUM = "inspection_request_status"
COMPANY_ENUM = "company"


def upgrade() -> None:
    """Create complete truck inspections system."""
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    # Reuse company enum created in previous migrations (PostgreSQL) while keeping compatibility with SQLite tests.
    if is_postgres:
        company_enum = postgresql.ENUM("SERVIGLOBAL", "EMATRA", name=COMPANY_ENUM, create_type=False)
    else:
        company_enum = sa.Enum("SERVIGLOBAL", "EMATRA", name=COMPANY_ENUM, create_type=True)

    # Ensure inspection request status enum exists.
    if is_postgres:
        postgresql.ENUM("PENDING", "COMPLETED", name=REQUEST_STATUS_ENUM).create(bind, checkfirst=True)
        request_status_enum = postgresql.ENUM("PENDING", "COMPLETED", name=REQUEST_STATUS_ENUM, create_type=False)
    else:
        request_status_enum = sa.Enum("PENDING", "COMPLETED", name=REQUEST_STATUS_ENUM, create_type=True)

    # Create truck_inspections table
    op.create_table(
        TRUCK_INSPECTIONS,
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id"),
            nullable=False,
            comment="ID del trabajador que hace la inspección",
        ),
        sa.Column(
            "truck_license_plate",
            sa.String(length=16),
            nullable=False,
            comment="Matrícula del camión",
        ),
        
        # Componentes de inspección: Neumáticos
        sa.Column("tires_status", sa.Boolean(), nullable=False, comment="Estado de neumáticos: true=bien, false=mal"),
        sa.Column("tires_notes", sa.Text(), nullable=True, comment="Notas sobre neumáticos si están mal"),
        sa.Column("tires_image_path", sa.String(length=500), nullable=True, comment="Ruta de imagen de neumáticos"),
        
        # Componentes de inspección: Frenos
        sa.Column("brakes_status", sa.Boolean(), nullable=False, comment="Estado de frenos: true=bien, false=mal"),
        sa.Column("brakes_notes", sa.Text(), nullable=True, comment="Notas sobre frenos si están mal"),
        sa.Column("brakes_image_path", sa.String(length=500), nullable=True, comment="Ruta de imagen de frenos"),
        
        # Componentes de inspección: Luces
        sa.Column("lights_status", sa.Boolean(), nullable=False, comment="Estado de luces: true=bien, false=mal"),
        sa.Column("lights_notes", sa.Text(), nullable=True, comment="Notas sobre luces si están mal"),
        sa.Column("lights_image_path", sa.String(length=500), nullable=True, comment="Ruta de imagen de luces"),
        
        # Componentes de inspección: Fluidos
        sa.Column("fluids_status", sa.Boolean(), nullable=False, comment="Estado de fluidos: true=bien, false=mal"),
        sa.Column("fluids_notes", sa.Text(), nullable=True, comment="Notas sobre fluidos si están mal"),
        sa.Column("fluids_image_path", sa.String(length=500), nullable=True, comment="Ruta de imagen de fluidos"),
        
        # Componentes de inspección: Documentación
        sa.Column("documentation_status", sa.Boolean(), nullable=False, comment="Estado de documentación: true=bien, false=mal"),
        sa.Column("documentation_notes", sa.Text(), nullable=True, comment="Notas sobre documentación si está mal"),
        sa.Column("documentation_image_path", sa.String(length=500), nullable=True, comment="Ruta de imagen de documentación"),
        
        # Componentes de inspección: Carrocería
        sa.Column("body_status", sa.Boolean(), nullable=False, comment="Estado de carrocería: true=bien, false=mal"),
        sa.Column("body_notes", sa.Text(), nullable=True, comment="Notas sobre carrocería si está mal"),
        sa.Column("body_image_path", sa.String(length=500), nullable=True, comment="Ruta de imagen de carrocería"),
        
        # Campos generales
        sa.Column("has_issues", sa.Boolean(), nullable=False, server_default=sa.text("false"), comment="Si hay algún problema general"),
        sa.Column("general_notes", sa.Text(), nullable=True, comment="Notas generales de la inspección"),
        
        # Campos de revisión por taller
        sa.Column("is_reviewed", sa.Boolean(), nullable=False, server_default=sa.text("false"), comment="Si la inspección ha sido revisada por taller"),
        sa.Column("reviewed_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True, comment="ID del usuario de taller que revisó"),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True, comment="Fecha y hora de la revisión"),
        sa.Column("revision_notes", sa.Text(), nullable=True, comment="Notas de la revisión del taller"),
        
        # Campos de empresa y fechas
        sa.Column("company", company_enum, nullable=True, comment="Empresa asociada: SERVIGLOBAL o EMATRA"),
        sa.Column("inspection_date", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"), comment="Fecha de la inspección"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"), comment="Fecha de creación"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"), comment="Última actualización"),
    )

    # Create indexes for truck_inspections
    op.create_index("ix_truck_inspections_user_id", TRUCK_INSPECTIONS, ["user_id"])
    op.create_index("ix_truck_inspections_truck_license_plate", TRUCK_INSPECTIONS, ["truck_license_plate"])
    op.create_index("ix_truck_inspections_inspection_date", TRUCK_INSPECTIONS, ["inspection_date"])
    op.create_index("ix_truck_inspections_has_issues", TRUCK_INSPECTIONS, ["has_issues"])
    op.create_index("ix_truck_inspections_is_reviewed", TRUCK_INSPECTIONS, ["is_reviewed"])
    op.create_index("ix_truck_inspections_company", TRUCK_INSPECTIONS, ["company"])

    # Create truck_inspection_requests table
    op.create_table(
        TRUCK_INSPECTION_REQUESTS,
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "requested_by", 
            sa.Integer(), 
            sa.ForeignKey("users.id"), 
            nullable=False,
            comment="ID del usuario que solicita la inspección manual"
        ),
        sa.Column(
            "target_user_id", 
            sa.Integer(), 
            sa.ForeignKey("users.id"), 
            nullable=False,
            comment="ID del trabajador que debe realizar la inspección"
        ),
        sa.Column("company", company_enum, nullable=True, comment="Empresa objetivo de la solicitud"),
        sa.Column("message", sa.Text(), nullable=True, comment="Mensaje opcional para el trabajador"),
        sa.Column(
            "status", 
            request_status_enum, 
            nullable=False, 
            server_default="PENDING",
            comment="Estado de la solicitud: PENDING o COMPLETED"
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"), comment="Fecha de creación de la solicitud"),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True, comment="Fecha de completado de la solicitud"),
    )
    
    # Create indexes for truck_inspection_requests
    op.create_index("ix_truck_inspection_requests_requested_by", TRUCK_INSPECTION_REQUESTS, ["requested_by"])
    op.create_index("ix_truck_inspection_requests_target_user_id", TRUCK_INSPECTION_REQUESTS, ["target_user_id"])
    op.create_index("ix_truck_inspection_requests_status", TRUCK_INSPECTION_REQUESTS, ["status"])
    op.create_index("ix_truck_inspection_requests_company", TRUCK_INSPECTION_REQUESTS, ["company"])


def downgrade() -> None:
    """Drop complete truck inspection system."""
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    # Drop truck_inspection_requests table and indexes
    op.drop_index("ix_truck_inspection_requests_company", table_name=TRUCK_INSPECTION_REQUESTS)
    op.drop_index("ix_truck_inspection_requests_status", table_name=TRUCK_INSPECTION_REQUESTS)
    op.drop_index("ix_truck_inspection_requests_target_user_id", table_name=TRUCK_INSPECTION_REQUESTS)
    op.drop_index("ix_truck_inspection_requests_requested_by", table_name=TRUCK_INSPECTION_REQUESTS)
    op.drop_table(TRUCK_INSPECTION_REQUESTS)

    # Drop truck_inspections table and indexes
    op.drop_index("ix_truck_inspections_company", table_name=TRUCK_INSPECTIONS)
    op.drop_index("ix_truck_inspections_is_reviewed", table_name=TRUCK_INSPECTIONS)
    op.drop_index("ix_truck_inspections_has_issues", table_name=TRUCK_INSPECTIONS)
    op.drop_index("ix_truck_inspections_inspection_date", table_name=TRUCK_INSPECTIONS)
    op.drop_index("ix_truck_inspections_truck_license_plate", table_name=TRUCK_INSPECTIONS)
    op.drop_index("ix_truck_inspections_user_id", table_name=TRUCK_INSPECTIONS)
    op.drop_table(TRUCK_INSPECTIONS)

    # Drop enum if PostgreSQL
    if is_postgres:
        postgresql.ENUM("PENDING", "COMPLETED", name=REQUEST_STATUS_ENUM).drop(bind, checkfirst=True)