"""Modelo para inspecciones de camiones."""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, func, Enum
from sqlalchemy.orm import relationship
from app.database.connection import Base
from app.models.company_enum import Company


class TruckInspection(Base):
    """Modelo para inspecciones obligatorias de camiones.
    
    Los trabajadores deben completar estas inspecciones 2 veces al mes.
    Incluye 6 componentes: neumáticos, frenos, luces, fluidos, documentación y carrocería.
    """
    __tablename__ = 'truck_inspections'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, 
        ForeignKey('users.id'), 
        nullable=False, 
        index=True,
        comment='ID del trabajador que hace la inspección'
    )
    truck_license_plate = Column(
        String(16), 
        nullable=False, 
        index=True,
        comment='Matrícula del camión'
    )
    
    # Neumáticos
    tires_status = Column(
        Boolean, 
        nullable=False,
        comment='Estado de neumáticos: true=bien, false=mal'
    )
    tires_notes = Column(
        Text, 
        nullable=True,
        comment='Notas sobre neumáticos si están mal'
    )
    tires_image_path = Column(
        String(500), 
        nullable=True,
        comment='Ruta de imagen de neumáticos'
    )
    
    # Frenos
    brakes_status = Column(
        Boolean, 
        nullable=False,
        comment='Estado de frenos: true=bien, false=mal'
    )
    brakes_notes = Column(
        Text, 
        nullable=True,
        comment='Notas sobre frenos si están mal'
    )
    brakes_image_path = Column(
        String(500), 
        nullable=True,
        comment='Ruta de imagen de frenos'
    )
    
    # Luces
    lights_status = Column(
        Boolean, 
        nullable=False,
        comment='Estado de luces: true=bien, false=mal'
    )
    lights_notes = Column(
        Text, 
        nullable=True,
        comment='Notas sobre luces si están mal'
    )
    lights_image_path = Column(
        String(500), 
        nullable=True,
        comment='Ruta de imagen de luces'
    )
    
    # Fluidos
    fluids_status = Column(
        Boolean, 
        nullable=False,
        comment='Estado de fluidos: true=bien, false=mal'
    )
    fluids_notes = Column(
        Text, 
        nullable=True,
        comment='Notas sobre fluidos si están mal'
    )
    fluids_image_path = Column(
        String(500), 
        nullable=True,
        comment='Ruta de imagen de fluidos'
    )
    
    # Documentación
    documentation_status = Column(
        Boolean, 
        nullable=False,
        comment='Estado de documentación: true=bien, false=mal'
    )
    documentation_notes = Column(
        Text, 
        nullable=True,
        comment='Notas sobre documentación si está mal'
    )
    documentation_image_path = Column(
        String(500), 
        nullable=True,
        comment='Ruta de imagen de documentación'
    )
    
    # Carrocería
    body_status = Column(
        Boolean, 
        nullable=False,
        comment='Estado de carrocería: true=bien, false=mal'
    )
    body_notes = Column(
        Text, 
        nullable=True,
        comment='Notas sobre carrocería si está mal'
    )
    body_image_path = Column(
        String(500), 
        nullable=True,
        comment='Ruta de imagen de carrocería'
    )
    
    # Campos de metadata
    has_issues = Column(
        Boolean, 
        nullable=False, 
        default=False,
        comment='Si hay algún problema general'
    )
    general_notes = Column(
        Text, 
        nullable=True,
        comment='Notas generales de la inspección'
    )
    
    # Campos de revisión
    is_reviewed = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default='0',
        comment='Si la inspección ha sido revisada por taller'
    )
    reviewed_by = Column(
        Integer,
        ForeignKey('users.id'),
        nullable=True,
        comment='ID del usuario de taller que revisó'
    )
    reviewed_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment='Fecha y hora de la revisión'
    )
    revision_notes = Column(
        Text,
        nullable=True,
        comment='Notas de la revisión del taller'
    )
    
    # Campo de empresa
    company = Column(
        Enum(Company, name="company"), 
        nullable=True, 
        comment="Empresa asociada: SERVIGLOBAL o EMATRA"
    )
    
    inspection_date = Column(
        DateTime(timezone=True), 
        nullable=False, 
        server_default=func.now(),
        comment='Fecha de la inspección'
    )
    created_at = Column(
        DateTime(timezone=True), 
        nullable=False, 
        server_default=func.now(),
        comment='Fecha de creación'
    )
    updated_at = Column(
        DateTime(timezone=True), 
        nullable=False, 
        server_default=func.now(),
        comment='Última actualización'
    )
    
    # Relaciones
    user = relationship('User', back_populates='truck_inspections', foreign_keys=[user_id])
    reviewer = relationship('User', foreign_keys=[reviewed_by])
    
    def __repr__(self):
        return f"<TruckInspection(id={self.id}, user_id={self.user_id}, truck={self.truck_license_plate}, has_issues={self.has_issues})>"
    
    @property
    def components_status(self):
        """Retorna un diccionario con el estado de todos los componentes."""
        return {
            'tires': self.tires_status,
            'brakes': self.brakes_status,
            'lights': self.lights_status,
            'fluids': self.fluids_status,
            'documentation': self.documentation_status,
            'body': self.body_status
        }
    
    @property
    def all_ok(self):
        """Retorna True si todos los componentes están bien."""
        return all([
            self.tires_status,
            self.brakes_status,
            self.lights_status,
            self.fluids_status,
            self.documentation_status,
            self.body_status
        ])