"""One-off helper to ensure the Postgres enum 'userrole' contains 'ADMINISTRACION'.

Run: python scripts/add_admin_role_enum.py

Safe to re-run (uses ADD VALUE IF NOT EXISTS). Prints final enum labels.
"""
from __future__ import annotations

import os
import sys

from sqlalchemy import create_engine, text


def main() -> int:
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL env var not set; aborting.")
        return 1

    engine = create_engine(db_url)
    with engine.begin() as conn:
        # Add enum value if missing
        conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'ADMINISTRACION'"))

    with engine.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid "
                "WHERE t.typname='userrole' ORDER BY enumsortorder"
            )
        ).fetchall()
        labels = [r[0] for r in rows]
        print("userrole enum values:", labels)
        if "ADMINISTRACION" in labels:
            print("OK: ADMINISTRACION present.")
            return 0
        else:
            print("ERROR: ADMINISTRACION still missing.")
            return 2


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
