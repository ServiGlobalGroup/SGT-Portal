from app.database.connection import get_db
from sqlalchemy import text

# Conectar a la base de datos
db = next(get_db())

# Verificar usuarios existentes
users_query = """
SELECT id, name, role FROM users LIMIT 5;
"""

try:
    result = db.execute(text(users_query))
    users = result.fetchall()
    
    print('👥 Usuarios en la base de datos:')
    for user in users:
        print(f'  - ID: {user.id}, Nombre: {user.name}, Rol: {user.role}')
        
    if not users:
        print('⚠️ No hay usuarios en la base de datos')
    
    # Crear algunas solicitudes de vacaciones de ejemplo
    if users:
        first_user_id = users[0].id
        
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
        
except Exception as e:
    print(f'❌ Error: {e}')
    db.rollback()
finally:
    db.close()
