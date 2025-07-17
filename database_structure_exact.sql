-- ===============================================
-- SGT Portal - DDL EXACTO DE LA BASE DE DATOS EN PRODUCCIÓN
-- ===============================================
-- Este archivo contiene el DDL exacto extraído de la base de datos
-- en funcionamiento del sistema SGT Portal
-- 
-- Extraído el: 17 de julio de 2025
-- Base de datos: PostgreSQL
-- Schema: public
-- ===============================================

-- ===============================================
-- CREAR SCHEMA
-- ===============================================
CREATE SCHEMA public AUTHORIZATION pg_database_owner;

-- ===============================================
-- TIPOS ENUMERADOS
-- ===============================================
CREATE TYPE public."userrole" AS ENUM (
	'ADMIN',
	'MANAGER',
	'EMPLOYEE');

-- ===============================================
-- SECUENCIAS
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
-- TABLAS
-- ===============================================

-- Tabla de control de versiones de Alembic
CREATE TABLE public.alembic_version (
    version_num varchar(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Permisos para alembic_version
ALTER TABLE public.alembic_version OWNER TO postgres;
GRANT ALL ON TABLE public.alembic_version TO postgres;

-- Tabla de historial de subidas
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

-- Índices para upload_history
CREATE INDEX ix_upload_history_id ON public.upload_history USING btree (id);
CREATE INDEX ix_upload_history_user_dni ON public.upload_history USING btree (user_dni);

-- Permisos para upload_history
ALTER TABLE public.upload_history OWNER TO postgres;
GRANT ALL ON TABLE public.upload_history TO postgres;

-- Tabla de usuarios
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

-- Índices para users
CREATE UNIQUE INDEX ix_users_dni_nie ON public.users USING btree (dni_nie);
CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);
CREATE INDEX ix_users_id ON public.users USING btree (id);

-- Permisos para users
ALTER TABLE public.users OWNER TO postgres;
GRANT ALL ON TABLE public.users TO postgres;

-- ===============================================
-- PERMISOS DE SCHEMA
-- ===============================================
GRANT ALL ON SCHEMA public TO pg_database_owner;
GRANT USAGE ON SCHEMA public TO public;

-- ===============================================
-- RESUMEN DE LA ESTRUCTURA
-- ===============================================
/*
ESTRUCTURA EXACTA DE LA BASE DE DATOS SGT PORTAL:

TABLAS:
1. public.alembic_version
   - version_num varchar(32) PRIMARY KEY

2. public.upload_history
   - id serial4 PRIMARY KEY
   - file_name varchar(255) NOT NULL
   - upload_date timestamp NOT NULL
   - user_dni varchar(20) NOT NULL
   - user_name varchar(200) NOT NULL
   - document_type varchar(20) NOT NULL
   - month varchar(2) NOT NULL
   - year varchar(4) NOT NULL
   - total_pages int4 NOT NULL
   - successful_pages int4 NOT NULL
   - failed_pages int4 NOT NULL
   - status varchar(20) NOT NULL
   - created_at timestamp NOT NULL
   - updated_at timestamp NOT NULL

3. public.users
   - id serial4 PRIMARY KEY
   - dni_nie varchar(20) NOT NULL UNIQUE
   - first_name varchar(100) NOT NULL
   - last_name varchar(100) NOT NULL
   - email varchar(255) NOT NULL UNIQUE
   - phone varchar(20) NULL
   - role public.userrole NOT NULL
   - department varchar(100) NOT NULL
   - position varchar(100) NULL
   - hire_date timestamp NULL
   - birth_date timestamp NULL
   - address text NULL
   - city varchar(100) NULL
   - postal_code varchar(10) NULL
   - emergency_contact_name varchar(200) NULL
   - emergency_contact_phone varchar(20) NULL
   - hashed_password varchar(255) NOT NULL
   - is_active bool NOT NULL
   - is_verified bool NOT NULL
   - avatar varchar(255) NULL
   - user_folder_path varchar(500) NULL
   - created_at timestamptz DEFAULT now() NULL
   - updated_at timestamptz DEFAULT now() NULL
   - last_login timestamptz NULL

TIPOS ENUMERADOS:
- public.userrole: 'ADMIN', 'MANAGER', 'EMPLOYEE'

SECUENCIAS:
- public.upload_history_id_seq
- public.users_id_seq

ÍNDICES:
- ix_users_dni_nie (UNIQUE)
- ix_users_email (UNIQUE)
- ix_users_id
- ix_upload_history_id
- ix_upload_history_user_dni

PERMISOS:
- Todas las tablas y secuencias: OWNER postgres
- Schema public: ALL para pg_database_owner, USAGE para public
*/
