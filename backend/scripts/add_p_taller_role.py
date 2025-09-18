#!/usr/bin/env python3
"""
Script simple para agregar P_TALLER al enum userrole directamente
"""
import os
import sys
import psycopg2
from psycopg2 import sql

# Configuración de la base de datos
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'sgt_portal_db',
    'user': 'user',
    'password': 'password'
}

def add_p_taller_role():
    """Agrega P_TALLER al enum userrole si no existe"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Verificar si P_TALLER ya existe
        cur.execute("SELECT unnest(enum_range(NULL::userrole))")
        existing_roles = [row[0] for row in cur.fetchall()]
        
        print("Roles existentes:", existing_roles)
        
        if 'P_TALLER' not in existing_roles:
            print("Agregando P_TALLER al enum userrole...")
            cur.execute("ALTER TYPE userrole ADD VALUE 'P_TALLER'")
            conn.commit()
            print("P_TALLER agregado correctamente")
        else:
            print("P_TALLER ya existe en la base de datos")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print("Error:", str(e))
        return False
    
    return True

if __name__ == "__main__":
    print("Agregando rol P_TALLER a la base de datos...")
    success = add_p_taller_role()
    sys.exit(0 if success else 1)