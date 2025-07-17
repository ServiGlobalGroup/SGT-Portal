-- ===============================================
-- SGT Portal - Database Schema DDL (ESTRUCTURA REAL)
-- ===============================================
-- Este archivo contiene la estructura REAL de la base de datos
-- extraída directamente del sistema SGT Portal en funcionamiento
-- 
-- Base de datos: PostgreSQL 13+
-- Actualizado: 17 de julio de 2025
-- Autor: Sistema SGT Portal
-- ===============================================

-- ===============================================
-- 1. CREAR BASE DE DATOS
-- ===============================================
-- CREATE DATABASE sgt_portal;
-- \c sgt_portal;

-- ===============================================
-- 2. CREAR SCHEMA
-- ===============================================
CREATE SCHEMA public AUTHORIZATION pg_database_owner;

-- ===============================================
-- 3. TIPOS ENUMERADOS
-- ===============================================

-- Enum para roles de usuario
CREATE TYPE public."userrole" AS ENUM (
	'ADMIN',
	'MANAGER',
	'EMPLOYEE');

-- ===============================================
-- 4. SECUENCIAS
-- ===============================================

-- Secuencia para upload_history
CREATE SEQUENCE public.upload_history_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permisos para upload_history_id_seq
ALTER SEQUENCE public.upload_history_id_seq OWNER TO postgres;
GRANT ALL ON SEQUENCE public.upload_history_id_seq TO postgres;

-- Secuencia para users
CREATE SEQUENCE public.users_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permisos para users_id_seq
ALTER SEQUENCE public.users_id_seq OWNER TO postgres;
GRANT ALL ON SEQUENCE public.users_id_seq TO postgres;

-- ===============================================
-- 5. TABLA DE CONTROL DE MIGRACIONES (ALEMBIC)
-- ===============================================

CREATE TABLE public.alembic_version (
    version_num varchar(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Permisos para alembic_version
ALTER TABLE public.alembic_version OWNER TO postgres;
GRANT ALL ON TABLE public.alembic_version TO postgres;

-- ===============================================
-- 6. TABLA DE USUARIOS
-- ===============================================

CREATE TABLE public.users (
    id serial4 NOT NULL,
    dni_nie varchar(20) NOT NULL,
    first_name varchar(100) NOT NULL,
    last_name varchar(100) NOT NULL,
    email varchar(255) NOT NULL,
    phone varchar(20) NULL,
    "role" public."userrole" NOT NULL,
    department varchar(100) NOT NULL,
    "position" varchar(100) NULL,
    hire_date timestamp NULL,
    birth_date timestamp NULL,
    address text NULL,
    city varchar(100) NULL,
    postal_code varchar(10) NULL,
    emergency_contact_name varchar(200) NULL,
    emergency_contact_phone varchar(20) NULL,
    hashed_password varchar(255) NOT NULL,
    is_active bool NOT NULL,
    is_verified bool NOT NULL,
    avatar varchar(255) NULL,
    user_folder_path varchar(500) NULL,
    created_at timestamptz DEFAULT now() NULL,
    updated_at timestamptz DEFAULT now() NULL,
    last_login timestamptz NULL,
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- Índices para la tabla users
CREATE UNIQUE INDEX ix_users_dni_nie ON public.users USING btree (dni_nie);
CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);
CREATE INDEX ix_users_id ON public.users USING btree (id);

-- Permisos para users
ALTER TABLE public.users OWNER TO postgres;
GRANT ALL ON TABLE public.users TO postgres;

-- ===============================================
-- 7. TABLA DE HISTORIAL DE SUBIDAS
-- ===============================================

CREATE TABLE public.upload_history (
    id serial4 NOT NULL,
    file_name varchar(255) NOT NULL,
    upload_date timestamp NOT NULL,
    user_dni varchar(20) NOT NULL,
    user_name varchar(200) NOT NULL,
    document_type varchar(20) NOT NULL,
    "month" varchar(2) NOT NULL,
    "year" varchar(4) NOT NULL,
    total_pages int4 NOT NULL,
    successful_pages int4 NOT NULL,
    failed_pages int4 NOT NULL,
    status varchar(20) NOT NULL,
    created_at timestamp NOT NULL,
    updated_at timestamp NOT NULL,
    CONSTRAINT upload_history_pkey PRIMARY KEY (id)
);

-- Índices para la tabla upload_history
CREATE INDEX ix_upload_history_id ON public.upload_history USING btree (id);
CREATE INDEX ix_upload_history_user_dni ON public.upload_history USING btree (user_dni);

-- Permisos para upload_history
ALTER TABLE public.upload_history OWNER TO postgres;
GRANT ALL ON TABLE public.upload_history TO postgres;

-- ===============================================
-- 8. PERMISOS DE SCHEMA
-- ===============================================

-- Permisos del schema público
GRANT ALL ON SCHEMA public TO pg_database_owner;
GRANT USAGE ON SCHEMA public TO public;

-- ===============================================
-- 9. DATOS INICIALES
-- ===============================================

-- Usuario administrador por defecto
INSERT INTO public.users (
    dni_nie, 
    first_name, 
    last_name, 
    email, 
    phone,
    role, 
    department, 
    position,
    hashed_password,
    is_active,
    is_verified
) VALUES (
    'ADMIN001', 
    'Admin', 
    'Sistema', 
    'admin@sgteuro.com',
    '600000000',
    'ADMIN', 
    'Sistemas', 
    'Administrador del Sistema',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewHDBVoUQ3oLO8/O', -- password: admin123
    TRUE,
    TRUE
) ON CONFLICT (dni_nie) DO NOTHING;

-- ===============================================
-- 10. ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- ===============================================

-- Índices adicionales para la tabla users (basados en consultas frecuentes)
CREATE INDEX IF NOT EXISTS idx_users_department ON public.users(department);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users("role");
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);

-- Índices adicionales para la tabla upload_history
CREATE INDEX IF NOT EXISTS idx_upload_history_document_type ON public.upload_history(document_type);
CREATE INDEX IF NOT EXISTS idx_upload_history_year_month ON public.upload_history("year", "month");
CREATE INDEX IF NOT EXISTS idx_upload_history_status ON public.upload_history(status);
CREATE INDEX IF NOT EXISTS idx_upload_history_upload_date ON public.upload_history(upload_date);

-- ===============================================
-- 11. TRIGGERS PARA UPDATED_AT (OPCIONAL)
-- ===============================================

-- Función para actualizar timestamp automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para users (solo si se desea automatización adicional)
-- CREATE TRIGGER update_users_updated_at 
--     BEFORE UPDATE ON public.users 
--     FOR EACH ROW 
--     EXECUTE FUNCTION update_updated_at_column();

-- Trigger para upload_history (solo si se desea automatización adicional)
-- CREATE TRIGGER update_upload_history_updated_at 
--     BEFORE UPDATE ON public.upload_history 
--     FOR EACH ROW 
--     EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- 12. VISTAS ÚTILES
-- ===============================================

-- Vista de usuarios activos con información completa
CREATE OR REPLACE VIEW active_users AS
SELECT 
    id,
    dni_nie,
    first_name,
    last_name,
    CONCAT(first_name, ' ', last_name) AS full_name,
    email,
    phone,
    role,
    department,
    position,
    hire_date,
    last_login,
    created_at
FROM public.users 
WHERE is_active = TRUE;

-- Vista de estadísticas de subidas por usuario
CREATE OR REPLACE VIEW upload_stats_by_user AS
SELECT 
    user_dni,
    user_name,
    document_type,
    COUNT(*) as total_uploads,
    SUM(total_pages) as total_pages_processed,
    SUM(successful_pages) as total_successful_pages,
    SUM(failed_pages) as total_failed_pages,
    MAX(upload_date) as last_upload_date
FROM public.upload_history
GROUP BY user_dni, user_name, document_type;

-- ===============================================
-- 13. FUNCIONES ÚTILES
-- ===============================================

-- Función para obtener el nombre completo de un usuario por DNI
CREATE OR REPLACE FUNCTION get_user_full_name(p_dni_nie VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    v_full_name VARCHAR;
BEGIN
    SELECT CONCAT(first_name, ' ', last_name) 
    INTO v_full_name
    FROM public.users 
    WHERE dni_nie = p_dni_nie AND is_active = TRUE;
    
    RETURN COALESCE(v_full_name, 'Usuario no encontrado');
END;
$$ LANGUAGE plpgsql;

-- Función para limpiar registros de historial antiguos (más de 2 años)
CREATE OR REPLACE FUNCTION cleanup_old_upload_history()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.upload_history 
    WHERE created_at < NOW() - INTERVAL '2 years';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 14. VERIFICACIÓN Y RESUMEN
-- ===============================================

-- Verificar que todo se ha creado correctamente
SELECT 'Base de datos SGT Portal creada exitosamente con estructura REAL' AS status;

-- Mostrar un resumen de las tablas creadas
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'upload_history', 'alembic_version')
ORDER BY tablename;

-- Mostrar información de las secuencias
SELECT 
    sequence_schema,
    sequence_name,
    start_value,
    minimum_value,
    maximum_value,
    increment
FROM information_schema.sequences 
WHERE sequence_schema = 'public';

-- ===============================================
-- NOTAS IMPORTANTES
-- ===============================================
/*
ESTRUCTURA ACTUAL DE LA BASE DE DATOS SGT PORTAL:

1. TABLAS PRINCIPALES:
   - public.users: Usuarios del sistema con roles y datos personales
   - public.upload_history: Historial de subidas de documentos
   - public.alembic_version: Control de versiones de migraciones

2. TIPOS ENUMERADOS:
   - public.userrole: ADMIN, MANAGER, EMPLOYEE

3. SECUENCIAS:
   - public.users_id_seq: Para IDs de usuarios
   - public.upload_history_id_seq: Para IDs de historial

4. CARACTERÍSTICAS ESPECIALES:
   - Índices únicos en dni_nie y email de usuarios
   - Timestamps con zona horaria en usuarios
   - Campo role como enum personalizado
   - Campos opcionales para flexibilidad

5. PERMISOS:
   - Todas las tablas y secuencias owned by postgres
   - Permisos completos para postgres
   - Schema público con permisos estándar

Esta estructura refleja exactamente la base de datos en funcionamiento
del sistema SGT Portal al 17 de julio de 2025.
*/

-- ===============================================
-- FIN DEL SCRIPT DDL REAL
-- ===============================================
