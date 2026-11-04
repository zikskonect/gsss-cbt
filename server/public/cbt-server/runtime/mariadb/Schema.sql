
-- cbt_platform database - Central DB for GSS Gwags CBT
-- Run in phpMyAdmin or: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS cbt_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cbt_platform;

-- Users: exam_office, teacher, form_teacher, student
CREATE TABLE IF NOT EXISTS users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(120) NOT NULL,
  role ENUM('exam_office','teacher','form_teacher','admin') NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(120) NULL,
  school_name VARCHAR(120) NULL,
  status ENUM('active','blocked') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role (role),
  INDEX idx_phone (phone_number)
);

-- Devices
CREATE TABLE IF NOT EXISTS devices (
  device_id VARCHAR(80) PRIMARY KEY,
  fingerprint VARCHAR(255) NULL,
  hostname VARCHAR(120) NULL,
  ip_address VARCHAR(45) NULL,
  platform VARCHAR(20) NULL,
  role_claimed VARCHAR(20) NULL,
  label VARCHAR(120) NULL,
  status ENUM('pending','approved','blocked') DEFAULT 'pending',
  first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  approved_at TIMESTAMP NULL,
  INDEX idx_status (status)
);

-- Classes, Arms, Departments
CREATE TABLE IF NOT EXISTS classes (
  class_id VARCHAR(40) PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  level VARCHAR(20) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS arms (
  arm_id VARCHAR(40) PRIMARY KEY,
  label VARCHAR(10) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
  department_id VARCHAR(40) PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Academic Years
CREATE TABLE IF NOT EXISTS academic_years (
  year_id VARCHAR(40) PRIMARY KEY,
  label VARCHAR(20) NOT NULL UNIQUE,
  status ENUM('active','archived') DEFAULT 'archived',
  started_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Form Teacher Assignments
CREATE TABLE IF NOT EXISTS form_teacher_assignments (
  assignment_id VARCHAR(60) PRIMARY KEY,
  class_id VARCHAR(40) NULL,
  class_name VARCHAR(80) NOT NULL,
  class_code VARCHAR(20) NOT NULL,
  arm VARCHAR(10) NOT NULL,
  teacher_name VARCHAR(120) NOT NULL,
  teacher_phone VARCHAR(20) NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by VARCHAR(20) NULL,
  UNIQUE KEY uniq_class_arm_year (class_code, arm, academic_year),
  INDEX idx_teacher_phone (teacher_phone)
);

-- Students
CREATE TABLE IF NOT EXISTS students (
  student_id VARCHAR(60) PRIMARY KEY,
  exam_code VARCHAR(40) UNIQUE NOT NULL,
  name VARCHAR(120) NOT NULL,
  class_name VARCHAR(80) NULL,
  class_code VARCHAR(20) NOT NULL,
  arm VARCHAR(10) NULL,
  status ENUM('active','archived','blocked') DEFAULT 'active',
  academic_year VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_class_code (class_code),
  INDEX idx_exam_code (exam_code)
);

-- Exams
CREATE TABLE IF NOT EXISTS exams (
  exam_id VARCHAR(60) PRIMARY KEY,
  subject VARCHAR(80) NOT NULL,
  class VARCHAR(20) NOT NULL,
  assessment_type ENUM('CA','EXAM') DEFAULT 'EXAM',
  duration INT NOT NULL,
  total_marks INT NULL,
  questions JSON NOT NULL,
  scheduled_date DATE NULL,
  created_by VARCHAR(20) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Results
CREATE TABLE IF NOT EXISTS results (
  result_id VARCHAR(80) PRIMARY KEY,
  exam_id VARCHAR(60) NOT NULL,
  student_id VARCHAR(60) NULL,
  exam_code VARCHAR(40) NOT NULL,
  student_name VARCHAR(120) NOT NULL,
  class_code VARCHAR(20) NOT NULL,
  score INT NOT NULL,
  total INT NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  answers JSON NULL,
  duration_taken INT NULL,
  device_id VARCHAR(80) NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_exam_id (exam_id),
  INDEX idx_exam_code (exam_code)
);

-- Seed default exam office user: phone 08000000000 password admin123
-- Password is SHA256('admin123') - replace with your hash
INSERT IGNORE INTO users (phone_number, name, role, password_hash) VALUES 
('08000000000', 'Exam Office', 'exam_office', SHA2('admin123', 256));

SELECT '✅ cbt_platform created' as status;
