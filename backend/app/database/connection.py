from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Motor de base de datos con configuración optimizada para PostgreSQL
engine = create_engine(
    settings.database_url,
    echo=settings.debug,  # Log SQL queries en modo debug
    pool_pre_ping=True,   # Verificar conexiones antes de usar
    pool_recycle=300,     # Reciclar conexiones cada 5 minutos
    pool_size=10,         # Tamaño del pool de conexiones
    max_overflow=20       # Conexiones adicionales si es necesario
)

# Generador de sesiones
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para modelos
Base = declarative_base()

# Dependencia para obtener sesión de DB
def get_db():
    """
    Dependency que proporciona una sesión de base de datos.
    Se cierra automáticamente al finalizar la request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Función para verificar la conexión a la base de datos
def check_database_connection():
    """
    Verifica que la conexión a la base de datos funcione correctamente.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"Error conectando a la base de datos: {e}")
        return False
