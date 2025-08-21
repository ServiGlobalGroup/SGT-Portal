#!/usr/bin/env python3
"""
Script para actualizar los valores del enum de vacation_requests
de minúsculas a mayúsculas para que coincidan con el modelo actualizado.
"""

import sys
import os

# Agregar el directorio backend al path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.database.connection import engine
from sqlalchemy import text

def update_vacation_status_values():
    """Actualiza los valores del enum de status en la tabla vacation_requests"""
    
    try:
        with engine.connect() as connection:
            # Verificar qué registros existen
            result = connection.execute(
                text("SELECT id, status FROM vacation_requests")
            )
            existing_records = list(result)
            
            print(f"Registros existentes: {len(existing_records)}")
            for record in existing_records:
                print(f"ID: {record.id}, Status actual: '{record.status}'")
            
            if existing_records:
                print("\n🔄 Eliminando restricción temporal...")
                
                # Eliminar la restricción existente primero
                connection.execute(
                    text("ALTER TABLE vacation_requests DROP CONSTRAINT IF EXISTS vacation_requests_status_check")
                )
                print("✅ Restricción eliminada temporalmente")
                
                print("\n🔄 Actualizando valores del enum...")
                
                # Actualizar pending -> PENDING
                pending_result = connection.execute(
                    text("UPDATE vacation_requests SET status = 'PENDING' WHERE status = 'pending'")
                )
                print(f"✅ Actualizados {pending_result.rowcount} registros de 'pending' -> 'PENDING'")
                
                # Actualizar approved -> APPROVED
                approved_result = connection.execute(
                    text("UPDATE vacation_requests SET status = 'APPROVED' WHERE status = 'approved'")
                )
                print(f"✅ Actualizados {approved_result.rowcount} registros de 'approved' -> 'APPROVED'")
                
                # Actualizar rejected -> REJECTED
                rejected_result = connection.execute(
                    text("UPDATE vacation_requests SET status = 'REJECTED' WHERE status = 'rejected'")
                )
                print(f"✅ Actualizados {rejected_result.rowcount} registros de 'rejected' -> 'REJECTED'")
                
                # Confirmar cambios
                connection.commit()
                print("✅ Cambios confirmados en la base de datos")
                
                # Verificar los resultados
                print("\n🔍 Verificando registros actualizados:")
                result = connection.execute(
                    text("SELECT id, status FROM vacation_requests")
                )
                updated_records = list(result)
                for record in updated_records:
                    print(f"ID: {record.id}, Status actualizado: '{record.status}'")
            else:
                print("ℹ️  No hay registros existentes para actualizar")
                
    except Exception as e:
        print(f"❌ Error actualizando valores del enum: {e}")
        return False
    
    return True

def update_enum_constraint():
    """Actualiza la restricción del enum en la base de datos"""
    
    try:
        with engine.connect() as connection:
            print("\n🔄 Actualizando restricción del enum...")
            
            # Eliminar la restricción existente si existe
            connection.execute(
                text("ALTER TABLE vacation_requests DROP CONSTRAINT IF EXISTS vacation_requests_status_check")
            )
            print("✅ Restricción anterior eliminada")
            
            # Agregar nueva restricción con valores en mayúscula
            connection.execute(
                text("""
                    ALTER TABLE vacation_requests 
                    ADD CONSTRAINT vacation_requests_status_check 
                    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
                """)
            )
            print("✅ Nueva restricción agregada")
            
            # Confirmar cambios
            connection.commit()
            print("✅ Restricción actualizada correctamente")
                
    except Exception as e:
        print(f"❌ Error actualizando restricción del enum: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("🚀 Iniciando actualización del enum de vacation_requests...")
    
    # Actualizar valores existentes
    if update_vacation_status_values():
        print("\n✅ Valores actualizados correctamente")
    else:
        print("\n❌ Error actualizando valores")
        sys.exit(1)
    
    # Actualizar restricción
    if update_enum_constraint():
        print("\n✅ Restricción actualizada correctamente")
    else:
        print("\n❌ Error actualizando restricción")
        sys.exit(1)
    
    print("\n🎉 Actualización completada exitosamente!")
    print("Ahora puedes reiniciar el backend para usar los nuevos valores del enum.")
