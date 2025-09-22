"""Utility to ensure resource tables exist in a local SQLite dev environment.

This does NOT replace Alembic migrations for production. It is a convenience helper
when using the default sqlite:///./dev.db during early development.

It will:
 - Load SQLAlchemy models Base metadata
 - Check if 'fuel_cards' and 'via_t_devices' exist
 - Create only the missing ones

Safe to re-run. In PostgreSQL you should rely on Alembic instead.
"""
from sqlalchemy import inspect
import os, sys

# Allow running this script from repo root by adding backend to sys.path
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BACKEND_PATH = os.path.join(ROOT, 'backend')
if BACKEND_PATH not in sys.path:
    sys.path.insert(0, BACKEND_PATH)

from app.database.connection import engine, Base  # type: ignore  # noqa: E402
from app.models import resources  # noqa: F401,E402 (imports models to register with Base)

TARGET_TABLES = {"fuel_cards", "via_t_devices"}

def main():
    insp = inspect(engine)
    existing = set(insp.get_table_names())
    missing = TARGET_TABLES - existing
    if not missing:
        print("All resource tables already exist:", ", ".join(sorted(TARGET_TABLES)))
        return
    print("Missing tables detected:", ", ".join(sorted(missing)))
    # Create only metadata for the models we care about (simplest: create_all then report)
    # create_all is idempotent; it will skip existing tables.
    Base.metadata.create_all(bind=engine, tables=[t for t in Base.metadata.sorted_tables if t.name in missing])
    # Re-inspect
    existing_after = set(inspect(engine).get_table_names())
    created = existing_after & missing
    if created:
        print("Created tables:", ", ".join(sorted(created)))
    still_missing = missing - created
    if still_missing:
        print("WARNING: Some tables could not be created:", ", ".join(sorted(still_missing)))
    else:
        print("Resource tables are now present.")

if __name__ == "__main__":
    main()
