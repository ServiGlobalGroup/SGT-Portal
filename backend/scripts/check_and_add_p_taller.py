# -*- coding: utf-8 -*-
import psycopg2
import sys

# Configuración de base de datos
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "SGT-Portal_db"
DB_USER = "postgres"
DB_PASSWORD = "1234"

def main():
    try:
        # Conectar a la base de datos
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        cur = conn.cursor()
        
        # Verificar roles existentes
        print("Verificando roles existentes...")
        cur.execute("SELECT unnest(enum_range(NULL::userrole))")
        existing_roles = [row[0] for row in cur.fetchall()]
        print("Roles actuales:", existing_roles)
        
        # Agregar P_TALLER si no existe
        if 'P_TALLER' not in existing_roles:
            print("Agregando P_TALLER al enum userrole...")
            cur.execute("ALTER TYPE userrole ADD VALUE 'P_TALLER'")
            conn.commit()
            print("SUCCESS: P_TALLER agregado correctamente!")
        else:
            print("INFO: P_TALLER ya existe en la base de datos")
        
        # Verificar de nuevo
        print("\nVerificando roles después del cambio...")
        cur.execute("SELECT unnest(enum_range(NULL::userrole))")
        updated_roles = [row[0] for row in cur.fetchall()]
        print("Roles finales:", updated_roles)
        
        cur.close()
        conn.close()
        
        return True
        
    except psycopg2.Error as e:
        print(f"ERROR de PostgreSQL: {e}")
        return False
    except Exception as e:
        print(f"ERROR: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)