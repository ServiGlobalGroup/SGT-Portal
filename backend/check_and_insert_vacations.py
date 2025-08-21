from app.database.connection import get_db
from sqlalchemy import text

# Conectar a la base de datos
db = next(get_db())

# Verificar estructura de la tabla users
structure_query = """
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;
"""

try:
    result = db.execute(text(structure_query))
    columns = result.fetchall()
    
    print('📋 Estructura de la tabla users:')
    for col in columns:
        print(f'  - {col.column_name}: {col.data_type} (nullable: {col.is_nullable})')
        
    # Ahora obtener usuarios con los nombres de columnas correctos
    users_query = """
    SELECT id, first_name, last_name, role FROM users LIMIT 5;
    """
    
    result = db.execute(text(users_query))
    users = result.fetchall()
    
    print('\n👥 Usuarios en la base de datos:')
    for user in users:
        print(f'  - ID: {user.id}, Nombre: {user.first_name} {user.last_name}, Rol: {user.role}')
        
    if not users:
        print('⚠️ No hay usuarios en la base de datos')
    
    # Crear algunas solicitudes de vacaciones de ejemplo si hay usuarios
    if users:
        first_user_id = users[0].id
        
        # Verificar si ya existen solicitudes
        check_query = "SELECT COUNT(*) FROM vacation_requests WHERE user_id = {}".format(first_user_id)
        result = db.execute(text(check_query))
        existing_count = result.scalar()
        
        if existing_count == 0:
            # Insertar datos de ejemplo
            insert_vacation_sql = """
            INSERT INTO vacation_requests (user_id, start_date, end_date, reason, status) VALUES
            ({}, '2025-09-15', '2025-09-19', 'Vacaciones familiares', 'pending'),
            ({}, '2025-10-01', '2025-10-05', 'Descanso personal', 'approved'),
            ({}, '2025-08-25', '2025-08-30', 'Viaje de placer', 'rejected');
            """.format(first_user_id, first_user_id, first_user_id)
            
            db.execute(text(insert_vacation_sql))
            db.commit()
            print('✅ Datos de ejemplo insertados exitosamente')
        else:
            print(f'ℹ️ Ya existen {existing_count} solicitudes para el usuario {first_user_id}')
        
except Exception as e:
    print(f'❌ Error: {e}')
    db.rollback()
finally:
    db.close()
