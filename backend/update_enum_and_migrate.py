#!/usr/bin/env python3
"""
Script para actualizar el enum userrole y migrar los datos
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text

def main():
    try:
        print("🚀 Iniciando actualización del enum y migración de roles...")
        
        # Conectar a la base de datos
        database_url = 'postgresql://postgres:1234@localhost/SGT-Portal_db'
        engine = create_engine(database_url)
        
        with engine.begin() as conn:
            # Mostrar usuarios actuales
            print("\n📋 Consultando usuarios actuales...")
            result = conn.execute(text('SELECT dni_nie, role FROM users ORDER BY dni_nie'))
            users = result.fetchall()
            
            print("👥 Usuarios encontrados:")
            for row in users:
                print(f"   - {row[0]}: {row[1]}")
            
            # Agregar nuevos valores al enum
            print("\n🔧 Actualizando enum userrole...")
            
            try:
                conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'ADMINISTRADOR'"))
                print("   ✅ Agregado valor 'ADMINISTRADOR'")
            except Exception as e:
                print(f"   ⚠️  ADMINISTRADOR ya existe o error: {e}")
            
            try:
                conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'TRAFICO'"))
                print("   ✅ Agregado valor 'TRAFICO'")
            except Exception as e:
                print(f"   ⚠️  TRAFICO ya existe o error: {e}")
            
            try:
                conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'TRABAJADOR'"))
                print("   ✅ Agregado valor 'TRABAJADOR'")
            except Exception as e:
                print(f"   ⚠️  TRABAJADOR ya existe o error: {e}")
            
            # Migrar roles
            print("\n🔄 Migrando roles de usuarios...")
            
            # EMPLOYEE -> TRABAJADOR
            result1 = conn.execute(text("UPDATE users SET role = 'TRABAJADOR' WHERE role = 'EMPLOYEE'"))
            if result1.rowcount > 0:
                print(f"   ✅ {result1.rowcount} usuarios EMPLOYEE → TRABAJADOR")
            
            # ADMIN -> ADMINISTRADOR  
            result2 = conn.execute(text("UPDATE users SET role = 'ADMINISTRADOR' WHERE role = 'ADMIN'"))
            if result2.rowcount > 0:
                print(f"   ✅ {result2.rowcount} usuarios ADMIN → ADMINISTRADOR")
            
            # MANAGER -> TRAFICO
            result3 = conn.execute(text("UPDATE users SET role = 'TRAFICO' WHERE role = 'MANAGER'"))
            if result3.rowcount > 0:
                print(f"   ✅ {result3.rowcount} usuarios MANAGER → TRAFICO")
            
            # Verificar resultado
            print("\n🔍 Verificando migración...")
            result = conn.execute(text('SELECT dni_nie, role FROM users ORDER BY dni_nie'))
            users = result.fetchall()
            
            print("👥 Usuarios después de migración:")
            for row in users:
                print(f"   - {row[0]}: {row[1]}")
        
        print("\n🎉 ¡Migración completada exitosamente!")
        print("\n⚠️  NOTA: Los valores antiguos del enum (ADMIN, MANAGER, EMPLOYEE) permanecen")
        print("    en el sistema para compatibilidad, pero ya no se usan.")
        return True
        
    except Exception as e:
        print(f"\n❌ Error durante la migración: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
