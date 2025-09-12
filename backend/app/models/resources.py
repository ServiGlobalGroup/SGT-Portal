from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base

class FuelCard(Base):
    __tablename__ = 'fuel_cards'

    id = Column(Integer, primary_key=True, index=True)
    pan = Column(String(64), nullable=False, index=True, comment='PAN de la tarjeta')
    matricula = Column(String(16), nullable=False, index=True, comment='Matrícula asociada')
    caducidad = Column(Date, nullable=True, comment='Fecha de caducidad')
    pin = Column(String(32), nullable=False, comment='PIN (considerar cifrado)')
    created_by = Column(Integer, ForeignKey('users.id'), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    creator = relationship('User')

    def masked_pin(self):  # util simple (usar getattr para evitar Column en análisis estático)
        _pin = getattr(self, 'pin', '') or ''
        return '•' * len(_pin)

    def __repr__(self):
        return f"<FuelCard id={self.id} pan={self.pan} matricula={self.matricula}>"


class ViaTDevice(Base):
    __tablename__ = 'via_t_devices'

    id = Column(Integer, primary_key=True, index=True)
    numero_telepeaje = Column(String(64), nullable=False, index=True, comment='Número telepeaje')
    pan = Column(String(64), nullable=False, index=True, comment='PAN Via T')
    compania = Column(String(64), nullable=True, comment='Compañía emisora')
    matricula = Column(String(16), nullable=False, index=True, comment='Matrícula asociada')
    caducidad = Column(Date, nullable=True, comment='Fecha de caducidad')
    created_by = Column(Integer, ForeignKey('users.id'), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    creator = relationship('User')

    def __repr__(self):
        return f"<ViaTDevice id={self.id} telepeaje={self.numero_telepeaje} matricula={self.matricula}>"
