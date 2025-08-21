from app.database.connection import get_db
from sqlalchemy import text

# Conectar a la base de datos
db = next(get_db())

# Crear la tabla vacation_requests
create_table_sql = """
CREATE TABLE IF NOT EXISTS vacation_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_response TEXT,
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

try:
    db.execute(text(create_table_sql))
    db.commit()
    print('✅ Tabla vacation_requests creada exitosamente')
except Exception as e:
    print(f'❌ Error creando tabla: {e}')
    db.rollback()
finally:
    db.close()
