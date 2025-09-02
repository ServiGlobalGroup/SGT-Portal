#!/usr/bin/env python3
"""
Script en dos pasos para actualizar enum y migrar datos
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text

def step1_update_enum():
    """Paso 1: Actualizar el enum"""
    try:
        print("🔧 PASO 1: Actualizando enum userrole...")
        
        database_url = 'postgresql://postgres:1234@localhost/SGT-Portal_db'
        engine = create_engine(database_url)
        
        with engine.begin() as conn:
            try:
                conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'ADMINISTRADOR'"))
                print("   ✅ Agregado valor 'ADMINISTRADOR'")
            except Exception as e:
                print(f"   ⚠️  ADMINISTRADOR: {e}")
            
            try:
                conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'TRAFICO'"))
                print("   ✅ Agregado valor 'TRAFICO'")
            except Exception as e:
                print(f"   ⚠️  TRAFICO: {e}")
            
            try:
                conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'TRABAJADOR'"))
                print("   ✅ Agregado valor 'TRABAJADOR'")
            except Exception as e:
                print(f"   ⚠️  TRABAJADOR: {e}")
        
        print("   🎯 Commit realizado. Enum actualizado.")
        return True
        
    except Exception as e:
        print(f"❌ Error en paso 1: {e}")
        return False

def step2_migrate_data():
    """Paso 2: Migrar los datos"""
    try:
        print("\n🔄 PASO 2: Migrando roles de usuarios...")
        
        database_url = 'postgresql://postgres:1234@localhost/SGT-Portal_db'
        engine = create_engine(database_url)
        
        with engine.begin() as conn:
            # Mostrar usuarios actuales
            result = conn.execute(text('SELECT dni_nie, role FROM users ORDER BY dni_nie'))
            users = result.fetchall()
            
            print("👥 Usuarios antes de migración:")
            for row in users:
                print(f"   - {row[0]}: {row[1]}")
            
            # Migrar roles
            print("\n   Ejecutando migraciones...")
            
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
            print("\n👥 Usuarios después de migración:")
            result = conn.execute(text('SELECT dni_nie, role FROM users ORDER BY dni_nie'))
            users = result.fetchall()
            
            for row in users:
                print(f"   - {row[0]}: {row[1]}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error en paso 2: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("🚀 Iniciando migración completa en dos pasos...")
    
    # Paso 1: Actualizar enum
    if not step1_update_enum():
        print("❌ Falló el paso 1")
        return False
    
    # Paso 2: Migrar datos
    if not step2_migrate_data():
        print("❌ Falló el paso 2")
        return False
    
    print("\n🎉 ¡Migración completada exitosamente!")
    print("\n📝 RESUMEN:")
    print("   • Enum userrole actualizado con nuevos valores")
    print("   • Usuarios migrados a los nuevos roles")
    print("   • Sistema listo para usar nueva estructura de roles")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
