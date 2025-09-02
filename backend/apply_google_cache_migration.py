#!/usr/bin/env python3
"""Script para aplicar migración manual de distancieros con caché Google Maps"""

import sys
import os

# Añadir path del backend al sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.connection import engine
from sqlalchemy import text

def apply_migration():
    """Aplica la migración manual completa"""
    migration_sql = """
    BEGIN;
    
    -- 1. Cambiar km a float
    ALTER TABLE distancieros
      ALTER COLUMN km TYPE double precision
      USING km::double precision;
    
    -- 2. Añadir columnas de caché (NULL por compatibilidad)
    ALTER TABLE distancieros
      ADD COLUMN IF NOT EXISTS origin varchar(200),
      ADD COLUMN IF NOT EXISTS origin_normalized varchar(220),
      ADD COLUMN IF NOT EXISTS mode varchar(30),
      ADD COLUMN IF NOT EXISTS duration_sec integer,
      ADD COLUMN IF NOT EXISTS polyline text,
      ADD COLUMN IF NOT EXISTS hash_key varchar(300);
    
    -- 3. Índices (con IF NOT EXISTS para idempotencia)
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='ix_distancieros_origin_normalized'
      ) THEN
        EXECUTE 'CREATE INDEX ix_distancieros_origin_normalized ON distancieros (origin_normalized)';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='ix_distancieros_hash_key'
      ) THEN
        EXECUTE 'CREATE UNIQUE INDEX ix_distancieros_hash_key ON distancieros (hash_key)';
      END IF;
    END$$;
    
    COMMIT;
    """
    
    stamp_sql = """
    UPDATE alembic_version 
    SET version_num = 'add_google_routes_cache_cols';
    """
    
    try:
        with engine.begin() as conn:
            print("Aplicando migración manual...")
            conn.execute(text(migration_sql))
            print("✓ Migración aplicada")
            
            print("Actualizando versión Alembic...")
            conn.execute(text(stamp_sql))
            print("✓ Alembic version stamp: add_google_routes_cache_cols")
            
        print("\n🎉 Migración completada exitosamente")
        return True
        
    except Exception as e:
        print(f"❌ Error durante migración: {e}")
        return False

if __name__ == "__main__":
    success = apply_migration()
    sys.exit(0 if success else 1)
