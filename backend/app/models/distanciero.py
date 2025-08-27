from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text
from sqlalchemy.sql import func
from app.database.connection import Base

class Distanciero(Base):
    __tablename__ = 'distancieros'

    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String(150), nullable=False, index=True)
    destination = Column(String(200), nullable=False)
    destination_normalized = Column(String(220), nullable=False, index=True)
    # km ahora Float (ver migración change_distanciero_km_float_20250826)
    km = Column(Float, nullable=False)
    # Campos adicionales para cache de rutas Google Maps (opcionalmente nulos para registros antiguos)
    origin = Column(String(200), nullable=True)
    origin_normalized = Column(String(220), nullable=True, index=True)
    mode = Column(String(30), nullable=True)  # DRIVING, WALKING, etc.
    duration_sec = Column(Integer, nullable=True)
    polyline = Column(Text, nullable=True)  # overview_polyline
    hash_key = Column(String(300), nullable=True, index=True, unique=True)
    active = Column(Boolean, nullable=False, server_default='true')
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<Distanciero id={self.id} client='{self.client_name}' dest='{self.destination}' km={self.km}>"