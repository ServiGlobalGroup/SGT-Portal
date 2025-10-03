"""Squashed initial baseline migration.

This migration replaces all previous incremental migrations by providing
the full current schema definition as a single baseline. Use this for
fresh production deployments. Existing databases should be STAMPED to
this revision (alembic stamp head) after ensuring their schema matches.

Revision ID: 2025_10_03_0000_squashed_initial_baseline
Revises: None
Create Date: 2025-10-03

IMPORTANT:
 - If deploying to PostgreSQL, you may prefer to implement ENUM types
   explicitly instead of relying on VARCHAR + CHECK constraints.
 - Triggers for updated_at columns are created for SQLite compatibility.
 - Adjust JSON/Text columns to JSONB in PostgreSQL if desired.
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "2025_10_03_0000_squashed_initial_baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # --- ENUM simulation via CHECK constraints (portable) ---
    # Users table
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("dni_nie", sa.String(length=20), nullable=False, unique=True, index=True),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True, index=True),
        sa.Column("phone", sa.String(length=20)),
        sa.Column("role", sa.String(length=20), nullable=False, server_default='TRABAJADOR'),
        sa.Column("department", sa.String(length=100), nullable=False),
        sa.Column("position", sa.String(length=100)),
        sa.Column("worker_type", sa.String(length=10), nullable=False, server_default='antiguo'),
        sa.Column("hire_date", sa.DateTime(timezone=True)),
        sa.Column("birth_date", sa.DateTime(timezone=True)),
        sa.Column("address", sa.Text()),
        sa.Column("city", sa.String(length=100)),
        sa.Column("postal_code", sa.String(length=10)),
        sa.Column("emergency_contact_name", sa.String(length=200)),
        sa.Column("emergency_contact_phone", sa.String(length=20)),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default='ACTIVO'),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column("avatar", sa.String(length=255)),
        sa.Column("user_folder_path", sa.String(length=500)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_login", sa.DateTime(timezone=True)),
        sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column("company", sa.String(length=20)),
    )
    op.create_index("idx_users_role", "users", ["role"], unique=False)
    op.create_index("idx_users_status", "users", ["status"], unique=False)
    op.create_index("idx_users_department", "users", ["department"], unique=False)
    op.create_index("idx_users_role_status", "users", ["role", "status"], unique=False)

    # upload_history
    op.create_table(
        "upload_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("upload_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("user_dni", sa.String(length=20), nullable=False, index=True),
        sa.Column("user_name", sa.String(length=200), nullable=False),
        sa.Column("document_type", sa.String(length=20), nullable=False),
        sa.Column("month", sa.String(length=2), nullable=False),
        sa.Column("year", sa.String(length=4), nullable=False),
        sa.Column("total_pages", sa.Integer(), nullable=False, server_default='0'),
        sa.Column("successful_pages", sa.Integer(), nullable=False, server_default='0'),
        sa.Column("failed_pages", sa.Integer(), nullable=False, server_default='0'),
        sa.Column("status", sa.String(length=20), nullable=False, server_default='processing'),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("company", sa.String(length=20)),
    )
    op.create_index("idx_upload_history_user_dni", "upload_history", ["user_dni"], unique=False)
    op.create_index("idx_upload_history_document_type", "upload_history", ["document_type"], unique=False)
    op.create_index("idx_upload_history_year_month", "upload_history", ["year", "month"], unique=False)

    # dietas
    op.create_table(
        "dietas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column("worker_type", sa.String(length=10), nullable=False),
        sa.Column("order_number", sa.String(length=100)),
        sa.Column("month", sa.String(length=10), nullable=False),
        sa.Column("total_amount", sa.Numeric(10,2), nullable=False),
        sa.Column("concepts", sa.Text(), nullable=False),
        sa.Column("notes", sa.String(length=500)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("company", sa.String(length=20)),
    )
    op.create_index("idx_dietas_user_id", "dietas", ["user_id"], unique=False)
    op.create_index("idx_dietas_month", "dietas", ["month"], unique=False)
    op.create_index("idx_dietas_order_number", "dietas", ["order_number"], unique=False)
    op.create_index("idx_dietas_user_month", "dietas", ["user_id", "month"], unique=False)

    # trips
    op.create_table(
        "trips",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column("order_number", sa.String(length=100), nullable=False),
        sa.Column("pernocta", sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column("festivo", sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column("canon_tti", sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column("event_date", sa.Date(), nullable=False),
        sa.Column("note", sa.String(length=500)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("company", sa.String(length=20)),
    )
    op.create_index("idx_trips_user_id", "trips", ["user_id"], unique=False)
    op.create_index("idx_trips_order_number", "trips", ["order_number"], unique=False)
    op.create_index("idx_trips_event_date", "trips", ["event_date"], unique=False)
    op.create_index("idx_trips_user_date", "trips", ["user_id", "event_date"], unique=False)

    # vacation_requests
    op.create_table(
        "vacation_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default='PENDING'),
        sa.Column("absence_type", sa.String(length=20), nullable=False, server_default='VACATION'),
        sa.Column("admin_response", sa.Text()),
        sa.Column("reviewed_by", sa.Integer(), sa.ForeignKey('users.id')),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("company", sa.String(length=20)),
    )
    op.create_index("idx_vacation_requests_user_id", "vacation_requests", ["user_id"], unique=False)
    op.create_index("idx_vacation_requests_status", "vacation_requests", ["status"], unique=False)
    op.create_index("idx_vacation_requests_start_date", "vacation_requests", ["start_date"], unique=False)
    op.create_index("idx_vacation_requests_reviewed_by", "vacation_requests", ["reviewed_by"], unique=False)
    op.create_index("idx_vacation_requests_user_status", "vacation_requests", ["user_id", "status"], unique=False)

    # activity_log
    op.create_table(
        "activity_log",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("actor_id", sa.Integer()),
        sa.Column("actor_dni", sa.String(length=20)),
        sa.Column("actor_name", sa.String(length=200)),
        sa.Column("entity_type", sa.String(length=50)),
        sa.Column("entity_id", sa.String(length=50)),
        sa.Column("message", sa.String(length=255), nullable=False),
        sa.Column("meta", sa.Text()),
        sa.Column("company", sa.String(length=20)),
    )
    op.create_index("idx_activity_log_created_at", "activity_log", ["created_at"], unique=False)
    op.create_index("idx_activity_log_event_type", "activity_log", ["event_type"], unique=False)
    op.create_index("idx_activity_log_actor_id", "activity_log", ["actor_id"], unique=False)
    op.create_index("idx_activity_log_actor_dni", "activity_log", ["actor_dni"], unique=False)
    op.create_index("idx_activity_log_entity_type", "activity_log", ["entity_type"], unique=False)

    # distancieros
    op.create_table(
        "distancieros",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("client_name", sa.String(length=150), nullable=False),
        sa.Column("destination", sa.String(length=200), nullable=False),
        sa.Column("destination_normalized", sa.String(length=220), nullable=False),
        sa.Column("km", sa.Float(), nullable=False),
        sa.Column("origin", sa.String(length=200)),
        sa.Column("origin_normalized", sa.String(length=220)),
        sa.Column("mode", sa.String(length=30)),
        sa.Column("duration_sec", sa.Integer()),
        sa.Column("polyline", sa.Text()),
        sa.Column("hash_key", sa.String(length=300), unique=True),
        sa.Column("uses_tolls", sa.Boolean()),
        sa.Column("verified_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("usage_count", sa.Integer(), server_default='0'),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column("notes", sa.String(length=500)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_distancieros_client_name", "distancieros", ["client_name"], unique=False)
    op.create_index("idx_distancieros_destination_normalized", "distancieros", ["destination_normalized"], unique=False)
    op.create_index("idx_distancieros_origin_normalized", "distancieros", ["origin_normalized"], unique=False)
    op.create_index("idx_distancieros_hash_key", "distancieros", ["hash_key"], unique=False)
    op.create_index("idx_distancieros_active", "distancieros", ["active"], unique=False)

    # truck_inspections
    op.create_table(
        "truck_inspections",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column("truck_license_plate", sa.String(length=16), nullable=False),
        sa.Column("tires_status", sa.Boolean(), nullable=False),
        sa.Column("tires_notes", sa.Text()),
        sa.Column("tires_image_path", sa.String(length=500)),
        sa.Column("brakes_status", sa.Boolean(), nullable=False),
        sa.Column("brakes_notes", sa.Text()),
        sa.Column("brakes_image_path", sa.String(length=500)),
        sa.Column("lights_status", sa.Boolean(), nullable=False),
        sa.Column("lights_notes", sa.Text()),
        sa.Column("lights_image_path", sa.String(length=500)),
        sa.Column("fluids_status", sa.Boolean(), nullable=False),
        sa.Column("fluids_notes", sa.Text()),
        sa.Column("fluids_image_path", sa.String(length=500)),
        sa.Column("documentation_status", sa.Boolean(), nullable=False),
        sa.Column("documentation_notes", sa.Text()),
        sa.Column("documentation_image_path", sa.String(length=500)),
        sa.Column("body_status", sa.Boolean(), nullable=False),
        sa.Column("body_notes", sa.Text()),
        sa.Column("body_image_path", sa.String(length=500)),
        sa.Column("has_issues", sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column("general_notes", sa.Text()),
        sa.Column("is_reviewed", sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column("reviewed_by", sa.Integer(), sa.ForeignKey('users.id')),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        sa.Column("revision_notes", sa.Text()),
        sa.Column("inspection_date", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("company", sa.String(length=20)),
    )
    op.create_index("idx_truck_inspections_user_id", "truck_inspections", ["user_id"], unique=False)
    op.create_index("idx_truck_inspections_truck_license_plate", "truck_inspections", ["truck_license_plate"], unique=False)
    op.create_index("idx_truck_inspections_inspection_date", "truck_inspections", ["inspection_date"], unique=False)
    op.create_index("idx_truck_inspections_has_issues", "truck_inspections", ["has_issues"], unique=False)
    op.create_index("idx_truck_inspections_is_reviewed", "truck_inspections", ["is_reviewed"], unique=False)
    op.create_index("idx_truck_inspections_reviewed_by", "truck_inspections", ["reviewed_by"], unique=False)
    op.create_index("idx_truck_inspections_user_date", "truck_inspections", ["user_id", "inspection_date"], unique=False)

    # truck_inspection_requests
    op.create_table(
        "truck_inspection_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("requested_by", sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column("target_user_id", sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column("company", sa.String(length=20)),
        sa.Column("message", sa.Text()),
        sa.Column("status", sa.String(length=20), nullable=False, server_default='PENDING'),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
    )
    op.create_index("idx_truck_inspection_requests_requested_by", "truck_inspection_requests", ["requested_by"], unique=False)
    op.create_index("idx_truck_inspection_requests_target_user_id", "truck_inspection_requests", ["target_user_id"], unique=False)
    op.create_index("idx_truck_inspection_requests_status", "truck_inspection_requests", ["status"], unique=False)
    op.create_index("idx_truck_inspection_requests_created_at", "truck_inspection_requests", ["created_at"], unique=False)

    # fuel_cards
    op.create_table(
        "fuel_cards",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("pan", sa.String(length=64), nullable=False),
        sa.Column("matricula", sa.String(length=16), nullable=False),
        sa.Column("caducidad", sa.Date()),
        sa.Column("pin", sa.String(length=32), nullable=False),
        sa.Column("compania", sa.String(length=64), nullable=False),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey('users.id')),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_fuel_cards_pan", "fuel_cards", ["pan"], unique=False)
    op.create_index("idx_fuel_cards_matricula", "fuel_cards", ["matricula"], unique=False)
    op.create_index("idx_fuel_cards_compania", "fuel_cards", ["compania"], unique=False)
    op.create_index("idx_fuel_cards_created_by", "fuel_cards", ["created_by"], unique=False)

    # via_t_devices
    op.create_table(
        "via_t_devices",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("numero_telepeaje", sa.String(length=64), nullable=False),
        sa.Column("pan", sa.String(length=64), nullable=False),
        sa.Column("compania", sa.String(length=64), nullable=False),
        sa.Column("matricula", sa.String(length=16), nullable=False),
        sa.Column("caducidad", sa.Date()),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey('users.id')),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_via_t_devices_numero_telepeaje", "via_t_devices", ["numero_telepeaje"], unique=False)
    op.create_index("idx_via_t_devices_pan", "via_t_devices", ["pan"], unique=False)
    op.create_index("idx_via_t_devices_compania", "via_t_devices", ["compania"], unique=False)
    op.create_index("idx_via_t_devices_matricula", "via_t_devices", ["matricula"], unique=False)
    op.create_index("idx_via_t_devices_created_by", "via_t_devices", ["created_by"], unique=False)

    # direct_inspection_orders (incluye campos de revisión integrados)
    op.create_table(
        "direct_inspection_orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("truck_license_plate", sa.String(length=16), nullable=False),
        sa.Column("vehicle_kind", sa.String(length=20), nullable=False),  # (TRACTORA|SEMIREMOLQUE)
        sa.Column("company", sa.String(length=20)),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        # Campos de revisión
        sa.Column("is_reviewed", sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column("reviewed_by_id", sa.Integer(), sa.ForeignKey('users.id')),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        sa.Column("revision_notes", sa.Text()),
    )
    op.create_index("ix_direct_inspection_orders_truck_license_plate", "direct_inspection_orders", ["truck_license_plate"], unique=False)
    op.create_index("ix_direct_inspection_orders_vehicle_kind", "direct_inspection_orders", ["vehicle_kind"], unique=False)
    op.create_index("ix_direct_inspection_orders_created_by_id", "direct_inspection_orders", ["created_by_id"], unique=False)
    op.create_index("ix_direct_inspection_orders_is_reviewed", "direct_inspection_orders", ["is_reviewed"], unique=False)
    op.create_index("ix_direct_inspection_orders_reviewed_by_id", "direct_inspection_orders", ["reviewed_by_id"], unique=False)

    # direct_inspection_order_modules
    op.create_table(
        "direct_inspection_order_modules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey('direct_inspection_orders.id', ondelete='CASCADE'), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_direct_inspection_order_modules_order_id", "direct_inspection_order_modules", ["order_id"], unique=False)

    # NOTE: Triggers (optional) should be created manually or via separate migrations in PostgreSQL.
    # For SQLite, you could execute raw SQL here if needed.


def downgrade():
    # Reverse order for FK dependencies
    op.drop_table("direct_inspection_order_modules")
    op.drop_index("ix_direct_inspection_orders_reviewed_by_id", table_name="direct_inspection_orders")
    op.drop_index("ix_direct_inspection_orders_is_reviewed", table_name="direct_inspection_orders")
    op.drop_index("ix_direct_inspection_orders_created_by_id", table_name="direct_inspection_orders")
    op.drop_index("ix_direct_inspection_orders_vehicle_kind", table_name="direct_inspection_orders")
    op.drop_index("ix_direct_inspection_orders_truck_license_plate", table_name="direct_inspection_orders")
    op.drop_table("direct_inspection_orders")
    op.drop_table("via_t_devices")
    op.drop_table("fuel_cards")
    op.drop_table("truck_inspection_requests")
    op.drop_table("truck_inspections")
    op.drop_table("distancieros")
    op.drop_table("activity_log")
    op.drop_table("vacation_requests")
    op.drop_table("trips")
    op.drop_table("dietas")
    op.drop_table("upload_history")
    op.drop_index("idx_users_role_status", table_name="users")
    op.drop_index("idx_users_department", table_name="users")
    op.drop_index("idx_users_status", table_name="users")
    op.drop_index("idx_users_role", table_name="users")
    op.drop_table("users")
