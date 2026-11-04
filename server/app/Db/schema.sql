-- server/app/db/schema.sql
-- ═══════════════════════════════════════════════════════════
--  GSS CBT — Central Database Schema
--  MySQL 5.7+ / MariaDB 10.3+ — utf8mb4
-- ═══════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET time_zone = '+01:00';   -- Africa/Lagos
SET FOREIGN_KEY_CHECKS = 0;

-- ─────────────────────────────────────────────────────────
--  USERS (admin / teacher / form_teacher)
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    phone_number    VARCHAR(20) NOT NULL,
    name            VARCHAR(120) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            ENUM('admin','teacher','form_teacher','exam_office') NOT NULL,
    email           VARCHAR(190) DEFAULT NULL,
    school_name     VARCHAR(190) DEFAULT NULL,
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uniq_phone (phone_number),
    KEY idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────
--  ACADEMIC YEARS
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS academic_years (
    year_id         VARCHAR(20) NOT NULL,           -- e.g. '2025/2026'
    label           VARCHAR(20) NOT NULL,
    is_current      TINYINT(1) NOT NULL DEFAULT 0,
    started_at      DATETIME DEFAULT NULL,
    closed_at       DATETIME DEFAULT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (year_id),
    KEY idx_is_current (is_current)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────
--  CLASSES / ARMS / DEPARTMENTS
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS classes (
    class_id        VARCHAR(40) NOT NULL,
    name            VARCHAR(60) NOT NULL,           -- 'SS 1'
    code            VARCHAR(20) NOT NULL,           -- 'SS1'
    level           VARCHAR(20) DEFAULT NULL,       -- 'SS'
    display_order   INT NOT NULL DEFAULT 999,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (class_id),
    UNIQUE KEY uniq_class_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS arms (
    arm_id          VARCHAR(40) NOT NULL,
    label           VARCHAR(3) NOT NULL,
    display_order   INT NOT NULL DEFAULT 999,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (arm_id),
    UNIQUE KEY uniq_arm_label (label)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS departments (
    department_id   VARCHAR(40) NOT NULL,
    name            VARCHAR(60) NOT NULL,
    display_order   INT NOT NULL DEFAULT 999,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (department_id),
    UNIQUE KEY uniq_department_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────
--  FORM TEACHER ASSIGNMENTS
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS form_teacher_assignments (
    assignment_id   VARCHAR(60) NOT NULL,
    class_id        VARCHAR(40) DEFAULT NULL,
    class_name      VARCHAR(60) NOT NULL,
    class_code      VARCHAR(20) NOT NULL,
    arm             VARCHAR(3) NOT NULL,
    teacher_name    VARCHAR(120) NOT NULL,
    teacher_phone   VARCHAR(20) NOT NULL,
    academic_year   VARCHAR(20) NOT NULL,
    assigned_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by     VARCHAR(20) DEFAULT NULL,
    PRIMARY KEY (assignment_id),
    UNIQUE KEY uniq_slot (class_code, arm, academic_year),
    KEY idx_teacher_phone (teacher_phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────
--  STUDENTS
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS students (
    student_id      VARCHAR(60) NOT NULL,
    exam_code       VARCHAR(40) NOT NULL,           -- 'GSS/SS1/002'
    name            VARCHAR(120) NOT NULL,
    class_id        VARCHAR(40) DEFAULT NULL,
    class_name      VARCHAR(60) DEFAULT NULL,
    class_code      VARCHAR(20) NOT NULL,
    arm             VARCHAR(3) DEFAULT NULL,
    department_id   VARCHAR(40) DEFAULT NULL,
    department_name VARCHAR(60) DEFAULT NULL,
    academic_year   VARCHAR(20) NOT NULL,
    serial          INT UNSIGNED NOT NULL,
    registered_by   VARCHAR(20) DEFAULT NULL,       -- form teacher phone
    registered_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status          ENUM('active','removed','transferred','archived') NOT NULL DEFAULT 'active',
    archived_at     DATETIME DEFAULT NULL,
    removed_at      DATETIME DEFAULT NULL,
    transferred_at  DATETIME DEFAULT NULL,
    PRIMARY KEY (student_id),
    UNIQUE KEY uniq_exam_code (exam_code),
    UNIQUE KEY uniq_class_year_serial (class_code, academic_year, serial),
    KEY idx_class_year (class_code, academic_year),
    KEY idx_year (academic_year),
    KEY idx_registrar (registered_by),
    KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────
--  EXAMS
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS exams (
    exam_id           VARCHAR(80) NOT NULL,
    subject           VARCHAR(120) NOT NULL,
    class_name        VARCHAR(60) NOT NULL,
    duration          INT UNSIGNED NOT NULL DEFAULT 30,
    assessment_type   ENUM('CA','EXAM') NOT NULL DEFAULT 'EXAM',
    scheduled_date    DATE DEFAULT NULL,
    created_by        VARCHAR(20) DEFAULT NULL,
    created_date      DATE DEFAULT NULL,
    questions_json    LONGTEXT NOT NULL,
    questions_to_publish INT UNSIGNED DEFAULT NULL, -- NEW: Gatekeeper for question pool
    pushed_to_clients TINYINT(1) NOT NULL DEFAULT 0,
    pushed_at         DATETIME DEFAULT NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (exam_id),
    KEY idx_class (class_name),
    KEY idx_scheduled (scheduled_date),
    KEY idx_pushed (pushed_to_clients)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────
--  RESULTS
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS results (
    result_id         VARCHAR(80) NOT NULL,
    exam_id           VARCHAR(80) NOT NULL,
    exam_subject      VARCHAR(120) DEFAULT NULL,
    student_id        VARCHAR(60) DEFAULT NULL,
    exam_code         VARCHAR(40) DEFAULT NULL,
    student_name      VARCHAR(120) NOT NULL,
    student_class     VARCHAR(60) DEFAULT NULL,
    student_arms      VARCHAR(3) DEFAULT NULL,
    score             INT UNSIGNED NOT NULL DEFAULT 0,
    total             INT UNSIGNED NOT NULL DEFAULT 0,
    percentage        INT UNSIGNED NOT NULL DEFAULT 0,
    duration_taken    INT UNSIGNED NOT NULL DEFAULT 0,
    answers_json      LONGTEXT NOT NULL,
    exam_details_json LONGTEXT NOT NULL,
    device_id         VARCHAR(60) DEFAULT NULL,     -- which device submitted
    submitted_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    harvested_at      DATETIME DEFAULT NULL,        -- when pulled to server
    PRIMARY KEY (result_id),
    UNIQUE KEY uniq_exam_student (exam_id, exam_code),
    KEY idx_exam (exam_id),
    KEY idx_student (exam_code),
    KEY idx_class (student_class),
    KEY idx_submitted (submitted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────
--  DEVICES
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS devices (
    device_id       VARCHAR(60) NOT NULL,
    fingerprint     VARCHAR(128) DEFAULT NULL,
    hostname        VARCHAR(120) DEFAULT NULL,
    ip_address      VARCHAR(45) DEFAULT NULL,
    mac_address     VARCHAR(20) DEFAULT NULL,
    platform        ENUM('electron','capacitor','web','unknown') NOT NULL DEFAULT 'unknown',
    role_claimed    VARCHAR(20) DEFAULT NULL,
    status          ENUM('pending','approved','blocked') NOT NULL DEFAULT 'pending',
    label           VARCHAR(120) DEFAULT NULL,      -- admin can name a device
    first_seen      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    approved_at     DATETIME DEFAULT NULL,
    approved_by     VARCHAR(20) DEFAULT NULL,
    blocked_at      DATETIME DEFAULT NULL,
    blocked_by      VARCHAR(20) DEFAULT NULL,
    PRIMARY KEY (device_id),
    KEY idx_status (status),
    KEY idx_platform (platform)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────
--  AUTH TOKENS
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS auth_tokens (
    token           VARCHAR(128) NOT NULL,
    user_phone      VARCHAR(20) DEFAULT NULL,
    device_id       VARCHAR(60) DEFAULT NULL,
    role            VARCHAR(20) NOT NULL,
    issued_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at      DATETIME NOT NULL,
    revoked         TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (token),
    KEY idx_user_phone (user_phone),
    KEY idx_device (device_id),
    KEY idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────
--  LOGIN ATTEMPTS (brute-force protection)
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS login_attempts (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    phone_number    VARCHAR(20) NOT NULL,
    ip_address      VARCHAR(45) DEFAULT NULL,
    device_id       VARCHAR(60) DEFAULT NULL,
    success         TINYINT(1) NOT NULL DEFAULT 0,
    attempted_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_phone_time (phone_number, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────
--  AUDIT LOG
-- ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    actor_phone     VARCHAR(20) DEFAULT NULL,
    device_id       VARCHAR(60) DEFAULT NULL,
    action          VARCHAR(80) NOT NULL,
    target          VARCHAR(120) DEFAULT NULL,
    details_json    TEXT DEFAULT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_actor (actor_phone),
    KEY idx_action (action),
    KEY idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ═══════════════════════════════════════════════════════════
--  SEED DEFAULT DATA
-- ═══════════════════════════════════════════════════════════

-- Default classes
INSERT IGNORE INTO classes (class_id, name, code, level, display_order) VALUES
    ('cls_jss1', 'JSS 1', 'JSS1', 'JSS', 1),
    ('cls_jss2', 'JSS 2', 'JSS2', 'JSS', 2),
    ('cls_jss3', 'JSS 3', 'JSS3', 'JSS', 3),
    ('cls_ss1',  'SS 1',  'SS1',  'SS',  4),
    ('cls_ss2',  'SS 2',  'SS2',  'SS',  5),
    ('cls_ss3',  'SS 3',  'SS3',  'SS',  6);

-- Default arms
INSERT IGNORE INTO arms (arm_id, label, display_order) VALUES
    ('arm_a', 'A', 1),
    ('arm_b', 'B', 2),
    ('arm_c', 'C', 3),
    ('arm_d', 'D', 4);

-- Default departments
INSERT IGNORE INTO departments (department_id, name, display_order) VALUES
    ('dept_science',  'Science',  1),
    ('dept_arts',     'Arts',     2),
    ('dept_business', 'Business', 3),
    ('dept_trade',    'Trade',    4);