-- ============================================================
-- SGT PORTAL - DDL ACTUALIZADO (Derivado de modelos SQLAlchemy)
-- Fecha de generación: 2025-09-30
-- Objetivo: DDL portable (PostgreSQL recomendado) / Compatible SQLite
-- NOTA: Para PostgreSQL se crean ENUM types. Para SQLite se usan CHECK.
-- ============================================================

-- =========================
-- SECTION: ENUM TYPES (PostgreSQL)
-- (Ignorar en SQLite, donde se usarán CHECK constraints)
-- =========================
-- CREATE TYPE user_role AS ENUM ('MASTER_ADMIN','ADMINISTRADOR','ADMINISTRACION','TRAFICO','TRABAJADOR','P_TALLER');
-- CREATE TYPE user_status AS ENUM ('ACTIVO','INACTIVO','BAJA');
-- CREATE TYPE vacation_status AS ENUM ('PENDING','APPROVED','REJECTED');
-- CREATE TYPE absence_type AS ENUM ('VACATION','PERSONAL');
-- CREATE TYPE company AS ENUM ('SERVIGLOBAL','EMATRA');
-- CREATE TYPE inspection_request_status AS ENUM ('PENDING','COMPLETED');

-- Para SQLite, mantener referencia de valores permitidos en comentarios.

-- =========================
-- TABLE: users
-- =========================
CREATE TABLE users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    dni_nie         VARCHAR(20)  NOT NULL UNIQUE,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    phone           VARCHAR(20),
    role            VARCHAR(20)  NOT NULL DEFAULT 'TRABAJADOR', -- user_role enum
    department      VARCHAR(100) NOT NULL,
    position        VARCHAR(100),
    worker_type     VARCHAR(10)  NOT NULL DEFAULT 'antiguo', -- (antiguo|nuevo)
    hire_date       TIMESTAMP,
    birth_date      TIMESTAMP,
    address         TEXT,
    city            VARCHAR(100),
    postal_code     VARCHAR(10),
    emergency_contact_name  VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    hashed_password VARCHAR(255) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVO', -- user_status enum
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    avatar          VARCHAR(255),
    user_folder_path VARCHAR(500),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login      TIMESTAMP,
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    company         VARCHAR(20), -- company enum
    CONSTRAINT chk_users_role CHECK (role IN ('MASTER_ADMIN','ADMINISTRADOR','ADMINISTRACION','TRAFICO','TRABAJADOR','P_TALLER')),
    CONSTRAINT chk_users_status CHECK (status IN ('ACTIVO','INACTIVO','BAJA')),
    CONSTRAINT chk_users_worker_type CHECK (worker_type IN ('antiguo','nuevo')),
    CONSTRAINT chk_users_company CHECK (company IS NULL OR company IN ('SERVIGLOBAL','EMATRA'))
);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_role_status ON users(role, status);

-- =========================
-- TABLE: upload_history
-- =========================
CREATE TABLE upload_history (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name        VARCHAR(255) NOT NULL,
    upload_date      TIMESTAMP    NOT NULL,
    user_dni         VARCHAR(20)  NOT NULL,
    user_name        VARCHAR(200) NOT NULL,
    document_type    VARCHAR(20)  NOT NULL, -- (nominas|dietas)
    month            VARCHAR(2)   NOT NULL,
    year             VARCHAR(4)   NOT NULL,
    total_pages      INTEGER NOT NULL DEFAULT 0,
    successful_pages INTEGER NOT NULL DEFAULT 0,
    failed_pages     INTEGER NOT NULL DEFAULT 0,
    status           VARCHAR(20) NOT NULL DEFAULT 'processing', -- (processing|completed|error)
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    company          VARCHAR(20),
    CONSTRAINT chk_upload_history_document_type CHECK (document_type IN ('nominas','dietas')),
    CONSTRAINT chk_upload_history_status CHECK (status IN ('processing','completed','error')),
    CONSTRAINT chk_upload_history_company CHECK (company IS NULL OR company IN ('SERVIGLOBAL','EMATRA'))
);
CREATE INDEX idx_upload_history_user_dni ON upload_history(user_dni);
CREATE INDEX idx_upload_history_document_type ON upload_history(document_type);
CREATE INDEX idx_upload_history_year_month ON upload_history(year, month);

-- =========================
-- TABLE: dietas
-- =========================
CREATE TABLE dietas (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    worker_type  VARCHAR(10)  NOT NULL, -- (antiguo|nuevo)
    order_number VARCHAR(100),
    month        VARCHAR(10)  NOT NULL, -- YYYY-MM-DD (fecha representada)
    total_amount DECIMAL(10,2) NOT NULL,
    concepts     TEXT NOT NULL, -- JSON (guardar como TEXT en SQLite / JSONB en PG)
    notes        VARCHAR(500),
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    company      VARCHAR(20),
    CONSTRAINT chk_dietas_worker_type CHECK (worker_type IN ('antiguo','nuevo')),
    CONSTRAINT chk_dietas_company CHECK (company IS NULL OR company IN ('SERVIGLOBAL','EMATRA'))
);
CREATE INDEX idx_dietas_user_id ON dietas(user_id);
CREATE INDEX idx_dietas_month ON dietas(month);
CREATE INDEX idx_dietas_order_number ON dietas(order_number);
CREATE INDEX idx_dietas_user_month ON dietas(user_id, month);

-- =========================
-- TABLE: trips
-- =========================
CREATE TABLE trips (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_number VARCHAR(100) NOT NULL,
    pernocta     BOOLEAN NOT NULL DEFAULT FALSE,
    festivo      BOOLEAN NOT NULL DEFAULT FALSE,
    canon_tti    BOOLEAN NOT NULL DEFAULT FALSE,
    event_date   DATE    NOT NULL,
    note         VARCHAR(500),
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    company      VARCHAR(20),
    CONSTRAINT chk_trips_company CHECK (company IS NULL OR company IN ('SERVIGLOBAL','EMATRA'))
);
CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_order_number ON trips(order_number);
CREATE INDEX idx_trips_event_date ON trips(event_date);
CREATE INDEX idx_trips_user_date ON trips(user_id, event_date);

-- =========================
-- TABLE: vacation_requests
-- =========================
CREATE TABLE vacation_requests (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date    TIMESTAMP NOT NULL,
    end_date      TIMESTAMP NOT NULL,
    reason        TEXT NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- vacation_status enum
    absence_type  VARCHAR(20) NOT NULL DEFAULT 'VACATION', -- absence_type enum
    admin_response TEXT,
    reviewed_by   INTEGER REFERENCES users(id),
    reviewed_at   TIMESTAMP,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    company       VARCHAR(20),
    CONSTRAINT chk_vacation_status CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    CONSTRAINT chk_absence_type CHECK (absence_type IN ('VACATION','PERSONAL')),
    CONSTRAINT chk_vacation_company CHECK (company IS NULL OR company IN ('SERVIGLOBAL','EMATRA'))
);
CREATE INDEX idx_vacation_requests_user_id ON vacation_requests(user_id);
CREATE INDEX idx_vacation_requests_status ON vacation_requests(status);
CREATE INDEX idx_vacation_requests_start_date ON vacation_requests(start_date);
CREATE INDEX idx_vacation_requests_reviewed_by ON vacation_requests(reviewed_by);
CREATE INDEX idx_vacation_requests_user_status ON vacation_requests(user_id, status);

-- =========================
-- TABLE: activity_log
-- =========================
CREATE TABLE activity_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    event_type  VARCHAR(50) NOT NULL,
    actor_id    INTEGER,
    actor_dni   VARCHAR(20),
    actor_name  VARCHAR(200),
    entity_type VARCHAR(50),
    entity_id   VARCHAR(50),
    message     VARCHAR(255) NOT NULL,
    meta        TEXT, -- JSON
    company     VARCHAR(20),
    CONSTRAINT chk_activity_log_company CHECK (company IS NULL OR company IN ('SERVIGLOBAL','EMATRA'))
);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);
CREATE INDEX idx_activity_log_event_type ON activity_log(event_type);
CREATE INDEX idx_activity_log_actor_id ON activity_log(actor_id);
CREATE INDEX idx_activity_log_actor_dni ON activity_log(actor_dni);
CREATE INDEX idx_activity_log_entity_type ON activity_log(entity_type);

-- =========================
-- TABLE: distancieros
-- =========================
CREATE TABLE distancieros (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name          VARCHAR(150) NOT NULL,
    destination          VARCHAR(200) NOT NULL,
    destination_normalized VARCHAR(220) NOT NULL,
    km                   REAL NOT NULL,
    origin               VARCHAR(200),
    origin_normalized    VARCHAR(220),
    mode                 VARCHAR(30),
    duration_sec         INTEGER,
    polyline             TEXT,
    hash_key             VARCHAR(300) UNIQUE,
    uses_tolls           BOOLEAN,
    verified_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usage_count          INTEGER DEFAULT 0,
    active               BOOLEAN NOT NULL DEFAULT TRUE,
    notes                VARCHAR(500),
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_distancieros_client_name ON distancieros(client_name);
CREATE INDEX idx_distancieros_destination_normalized ON distancieros(destination_normalized);
CREATE INDEX idx_distancieros_origin_normalized ON distancieros(origin_normalized);
CREATE INDEX idx_distancieros_hash_key ON distancieros(hash_key);
CREATE INDEX idx_distancieros_active ON distancieros(active);

-- =========================
-- TABLE: truck_inspections
-- =========================
CREATE TABLE truck_inspections (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    truck_license_plate   VARCHAR(16) NOT NULL,
    tires_status          BOOLEAN NOT NULL,
    tires_notes           TEXT,
    tires_image_path      VARCHAR(500),
    brakes_status         BOOLEAN NOT NULL,
    brakes_notes          TEXT,
    brakes_image_path     VARCHAR(500),
    lights_status         BOOLEAN NOT NULL,
    lights_notes          TEXT,
    lights_image_path     VARCHAR(500),
    fluids_status         BOOLEAN NOT NULL,
    fluids_notes          TEXT,
    fluids_image_path     VARCHAR(500),
    documentation_status  BOOLEAN NOT NULL,
    documentation_notes   TEXT,
    documentation_image_path VARCHAR(500),
    body_status           BOOLEAN NOT NULL,
    body_notes            TEXT,
    body_image_path       VARCHAR(500),
    has_issues            BOOLEAN NOT NULL DEFAULT FALSE,
    general_notes         TEXT,
    is_reviewed           BOOLEAN NOT NULL DEFAULT FALSE,
    reviewed_by           INTEGER REFERENCES users(id),
    reviewed_at           TIMESTAMP,
    revision_notes        TEXT,
    inspection_date       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    company               VARCHAR(20),
    CONSTRAINT chk_truck_inspections_company CHECK (company IS NULL OR company IN ('SERVIGLOBAL','EMATRA'))
);
CREATE INDEX idx_truck_inspections_user_id ON truck_inspections(user_id);
CREATE INDEX idx_truck_inspections_truck_license_plate ON truck_inspections(truck_license_plate);
CREATE INDEX idx_truck_inspections_inspection_date ON truck_inspections(inspection_date);
CREATE INDEX idx_truck_inspections_has_issues ON truck_inspections(has_issues);
CREATE INDEX idx_truck_inspections_is_reviewed ON truck_inspections(is_reviewed);
CREATE INDEX idx_truck_inspections_reviewed_by ON truck_inspections(reviewed_by);
CREATE INDEX idx_truck_inspections_user_date ON truck_inspections(user_id, inspection_date);

-- =========================
-- TABLE: truck_inspection_requests
-- =========================
CREATE TABLE truck_inspection_requests (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    requested_by   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company        VARCHAR(20),
    message        TEXT,
    status         VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- inspection_request_status enum
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at   TIMESTAMP,
    CONSTRAINT chk_truck_inspection_requests_status CHECK (status IN ('PENDING','COMPLETED')),
    CONSTRAINT chk_truck_inspection_requests_company CHECK (company IS NULL OR company IN ('SERVIGLOBAL','EMATRA'))
);
CREATE INDEX idx_truck_inspection_requests_requested_by ON truck_inspection_requests(requested_by);
CREATE INDEX idx_truck_inspection_requests_target_user_id ON truck_inspection_requests(target_user_id);
CREATE INDEX idx_truck_inspection_requests_status ON truck_inspection_requests(status);
CREATE INDEX idx_truck_inspection_requests_created_at ON truck_inspection_requests(created_at);

-- =========================
-- TABLE: fuel_cards
-- =========================
CREATE TABLE fuel_cards (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    pan         VARCHAR(64) NOT NULL,
    matricula   VARCHAR(16) NOT NULL,
    caducidad   DATE,
    pin         VARCHAR(32) NOT NULL,
    compania    VARCHAR(64) NOT NULL,
    created_by  INTEGER REFERENCES users(id),
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_fuel_cards_pan ON fuel_cards(pan);
CREATE INDEX idx_fuel_cards_matricula ON fuel_cards(matricula);
CREATE INDEX idx_fuel_cards_compania ON fuel_cards(compania);
CREATE INDEX idx_fuel_cards_created_by ON fuel_cards(created_by);

-- =========================
-- TABLE: via_t_devices
-- =========================
CREATE TABLE via_t_devices (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_telepeaje  VARCHAR(64) NOT NULL,
    pan               VARCHAR(64) NOT NULL,
    compania          VARCHAR(64) NOT NULL,
    matricula         VARCHAR(16) NOT NULL,
    caducidad         DATE,
    created_by        INTEGER REFERENCES users(id),
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_via_t_devices_numero_telepeaje ON via_t_devices(numero_telepeaje);
CREATE INDEX idx_via_t_devices_pan ON via_t_devices(pan);
CREATE INDEX idx_via_t_devices_compania ON via_t_devices(compania);
CREATE INDEX idx_via_t_devices_matricula ON via_t_devices(matricula);
CREATE INDEX idx_via_t_devices_created_by ON via_t_devices(created_by);

-- =========================
-- TRIGGERS (SQLite) para mantener updated_at
-- (En PostgreSQL se puede usar ON UPDATE trigger / GENERATED ALWAYS AS)
-- =========================
CREATE TRIGGER trg_users_updated_at AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
CREATE TRIGGER trg_upload_history_updated_at AFTER UPDATE ON upload_history
BEGIN
  UPDATE upload_history SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
CREATE TRIGGER trg_vacation_requests_updated_at AFTER UPDATE ON vacation_requests
BEGIN
  UPDATE vacation_requests SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
CREATE TRIGGER trg_distancieros_updated_at AFTER UPDATE ON distancieros
BEGIN
  UPDATE distancieros SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
CREATE TRIGGER trg_truck_inspections_updated_at AFTER UPDATE ON truck_inspections
BEGIN
  UPDATE truck_inspections SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
CREATE TRIGGER trg_fuel_cards_updated_at AFTER UPDATE ON fuel_cards
BEGIN
  UPDATE fuel_cards SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
CREATE TRIGGER trg_via_t_devices_updated_at AFTER UPDATE ON via_t_devices
BEGIN
  UPDATE via_t_devices SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- =========================
-- NOTAS:
-- 1. Para PostgreSQL: Reemplazar columnas TEXT JSON por JSONB si se desea.
-- 2. Reemplazar VARCHAR por TEXT donde no se necesite límite estricto.
-- 3. Añadir constraints adicionales (FK ON UPDATE CASCADE) si la lógica lo requiere.
-- =========================

/* FIN DEL DDL */