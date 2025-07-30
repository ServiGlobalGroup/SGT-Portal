#!/usr/bin/env python3
"""
Script temporal para migrar roles de usuario
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text

def main():
    try:
        print("🚀 Iniciando migración de roles de usuario...")
        
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
            
            # Migrar roles
            print("\n🔄 Migrando roles...")
            
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
        return True
        
    except Exception as e:
        print(f"\n❌ Error durante la migración: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
