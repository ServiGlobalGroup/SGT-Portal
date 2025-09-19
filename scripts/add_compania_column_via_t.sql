-- Script para agregar columna 'compania' a la tabla via_t_devices
-- Esta columna es para identificar la empresa emisora del dispositivo (ej: BIP&DRIVE)
-- No confundir con 'company' que es para filtros de empresa

-- Agregar la columna compania
ALTER TABLE via_t_devices 
ADD COLUMN compania VARCHAR(64) NOT NULL DEFAULT 'BIP&DRIVE';

-- Crear índice para mejorar performance en consultas
CREATE INDEX idx_via_t_devices_compania ON via_t_devices (compania);

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'via_t_devices' 
ORDER BY ordinal_position;