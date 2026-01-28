-- ============================================
-- University In-Course Marks Management System
-- Database Schema - MySQL
-- ============================================

-- Create database (if running manually)
-- CREATE DATABASE IF NOT EXISTS uni_marks_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE uni_marks_db;

-- ============================================
-- DROP TABLES (for clean setup)
-- ============================================
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS marks;
DROP TABLE IF EXISTS assessments;
DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS subject_assignments;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS roles;

-- ============================================
-- ROLES TABLE
-- ============================================
CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL COMMENT 'Role name: SUPER_ADMIN, HOD, LECTURER, STUDENT',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- DEPARTMENTS TABLE
-- ============================================
CREATE TABLE departments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(20) UNIQUE NOT NULL COMMENT 'Department code: CSE, ECE, MECH',
    name VARCHAR(255) NOT NULL COMMENT 'Full department name',
    hod_id INT NULL COMMENT 'Foreign key to users table (HOD)',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_is_active (is_active),
    INDEX idx_hod_id (hod_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    employee_id VARCHAR(50) UNIQUE NULL COMMENT 'For staff (Lecturer, HOD, Admin)',
    student_id VARCHAR(50) UNIQUE NULL COMMENT 'For students',
    role_id INT NOT NULL,
    department_id INT NULL COMMENT 'Department affiliation',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,

    INDEX idx_email (email),
    INDEX idx_employee_id (employee_id),
    INDEX idx_student_id (student_id),
    INDEX idx_role_id (role_id),
    INDEX idx_department_id (department_id),
    INDEX idx_is_active (is_active),

    CONSTRAINT chk_user_identifier CHECK (
        (employee_id IS NOT NULL AND student_id IS NULL) OR
        (employee_id IS NULL AND student_id IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key to departments table for HOD
ALTER TABLE departments
ADD CONSTRAINT fk_departments_hod
FOREIGN KEY (hod_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================
-- SUBJECTS TABLE
-- ============================================
CREATE TABLE subjects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(20) UNIQUE NOT NULL COMMENT 'Subject code: CSE301, MATH101',
    name VARCHAR(255) NOT NULL,
    department_id INT NOT NULL,
    semester INT NOT NULL COMMENT 'Semester number (1-8 for undergraduate)',
    credits INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,

    INDEX idx_code (code),
    INDEX idx_department_id (department_id),
    INDEX idx_semester (semester),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SUBJECT_ASSIGNMENTS TABLE (Lecturer to Subject mapping)
-- ============================================
CREATE TABLE subject_assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subject_id INT NOT NULL,
    lecturer_id INT NOT NULL,
    academic_year VARCHAR(10) NOT NULL COMMENT 'Academic year: 2024-25',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE,

    UNIQUE KEY unique_assignment (subject_id, lecturer_id, academic_year),
    INDEX idx_lecturer_id (lecturer_id),
    INDEX idx_subject_id (subject_id),
    INDEX idx_academic_year (academic_year),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ENROLLMENTS TABLE (Student to Subject mapping)
-- ============================================
CREATE TABLE enrollments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    academic_year VARCHAR(10) NOT NULL,
    semester INT NOT NULL COMMENT 'Current semester when enrolled',
    enrollment_date DATE NOT NULL,
    status ENUM('ACTIVE', 'DROPPED', 'COMPLETED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,

    UNIQUE KEY unique_enrollment (student_id, subject_id, academic_year),
    INDEX idx_student_id (student_id),
    INDEX idx_subject_id (subject_id),
    INDEX idx_academic_year (academic_year),
    INDEX idx_status (status),
    INDEX idx_semester (semester)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ASSESSMENTS TABLE (Define assessment types)
-- ============================================
CREATE TABLE assessments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT 'Assessment name: Internal 1, Assignment 1',
    assessment_type ENUM('INTERNAL', 'ASSIGNMENT', 'PROJECT', 'FINAL_EXAM', 'MIDTERM', 'QUIZ', 'LAB', 'OTHER') NOT NULL,
    subject_id INT NOT NULL,
    max_marks DECIMAL(5,2) NOT NULL,
    weightage DECIMAL(5,2) NULL COMMENT 'Percentage contribution to final grade',
    assessment_date DATE NULL,
    academic_year VARCHAR(10) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,

    INDEX idx_subject_id (subject_id),
    INDEX idx_assessment_type (assessment_type),
    INDEX idx_academic_year (academic_year),
    INDEX idx_assessment_date (assessment_date),
    INDEX idx_is_active (is_active),

    CONSTRAINT chk_max_marks CHECK (max_marks > 0),
    CONSTRAINT chk_weightage CHECK (weightage IS NULL OR (weightage >= 0 AND weightage <= 100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MARKS TABLE (Core marks data with workflow)
-- ============================================
CREATE TABLE marks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    enrollment_id INT NOT NULL,
    assessment_id INT NOT NULL,
    marks_obtained DECIMAL(5,2) NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    submitted_by INT NOT NULL COMMENT 'Lecturer who submitted',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INT NULL COMMENT 'HOD who approved/rejected',
    reviewed_at TIMESTAMP NULL,
    review_comments TEXT,
    is_absent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,

    UNIQUE KEY unique_mark (enrollment_id, assessment_id),
    INDEX idx_enrollment_id (enrollment_id),
    INDEX idx_assessment_id (assessment_id),
    INDEX idx_status (status),
    INDEX idx_submitted_by (submitted_by),
    INDEX idx_reviewed_by (reviewed_by),
    INDEX idx_submitted_at (submitted_at),

    CONSTRAINT chk_marks_valid CHECK (
        marks_obtained >= 0
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- AUDIT_LOGS TABLE (Track all modifications)
-- ============================================
CREATE TABLE audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    table_name VARCHAR(50) NOT NULL,
    record_id INT NOT NULL,
    action ENUM('INSERT', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT') NOT NULL,
    field_name VARCHAR(100) NULL COMMENT 'Which field was changed',
    old_value TEXT NULL,
    new_value TEXT NULL,
    performed_by INT NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE RESTRICT,

    INDEX idx_table_record (table_name, record_id),
    INDEX idx_performed_by (performed_by),
    INDEX idx_timestamp (timestamp),
    INDEX idx_action (action),
    INDEX idx_table_name (table_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INITIAL DATA SEEDING
-- ============================================

-- Insert default roles
INSERT INTO roles (name, description) VALUES
('SUPER_ADMIN', 'Full system access and administration'),
('HOD', 'Head of Department - Department level management'),
('LECTURER', 'Faculty member - Marks entry and management'),
('STUDENT', 'Student - View own marks and reports');

-- Insert sample departments
INSERT INTO departments (code, name) VALUES
('CSE', 'Computer Science and Engineering'),
('ECE', 'Electronics and Communication Engineering'),
('MECH', 'Mechanical Engineering'),
('CIVIL', 'Civil Engineering'),
('EEE', 'Electrical and Electronics Engineering');

-- Insert default super admin user
-- Password: admin123 (hashed with bcrypt)
-- Note: The password hash below is for 'admin123'
INSERT INTO users (email, password_hash, first_name, last_name, employee_id, role_id, is_active)
VALUES (
    'admin@university.edu',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5f9.KN.4xpW7e',
    'System',
    'Administrator',
    'EMP001',
    1,
    TRUE
);

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Insert sample HOD (HOD role_id = 2)
INSERT INTO users (email, password_hash, first_name, last_name, employee_id, role_id, department_id, is_active)
VALUES (
    'hod.cse@university.edu',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5f9.KN.4xpW7e',
    'John',
    'Smith',
    'HOD001',
    2,
    1,
    TRUE
);

-- Update CSE department with HOD
UPDATE departments SET hod_id = 2 WHERE code = 'CSE';

-- Insert sample lecturer (Lecturer role_id = 3)
INSERT INTO users (email, password_hash, first_name, last_name, employee_id, role_id, department_id, is_active)
VALUES (
    'lecturer1@university.edu',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5f9.KN.4xpW7e',
    'Jane',
    'Doe',
    'LEC001',
    3,
    1,
    TRUE
);

-- Insert sample students (Student role_id = 4)
INSERT INTO users (email, password_hash, first_name, last_name, student_id, role_id, department_id, is_active)
VALUES
(
    'student1@university.edu',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5f9.KN.4xpW7e',
    'Alice',
    'Johnson',
    'STU001',
    4,
    1,
    TRUE
),
(
    'student2@university.edu',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5f9.KN.4xpW7e',
    'Bob',
    'Williams',
    'STU002',
    4,
    1,
    TRUE
);

-- Insert sample subjects
INSERT INTO subjects (code, name, department_id, semester, credits, is_active)
VALUES
('CSE301', 'Data Structures and Algorithms', 1, 3, 4, TRUE),
('CSE302', 'Database Management Systems', 1, 3, 3, TRUE),
('CSE401', 'Machine Learning', 1, 4, 4, TRUE);

-- Assign lecturer to subjects for academic year 2024-25
INSERT INTO subject_assignments (subject_id, lecturer_id, academic_year, is_active)
VALUES
(1, 3, '2024-25', TRUE),
(2, 3, '2024-25', TRUE);

-- Enroll students in subjects
INSERT INTO enrollments (student_id, subject_id, academic_year, semester, enrollment_date, status)
VALUES
(4, 1, '2024-25', 3, '2024-07-01', 'ACTIVE'),
(4, 2, '2024-25', 3, '2024-07-01', 'ACTIVE'),
(5, 1, '2024-25', 3, '2024-07-01', 'ACTIVE'),
(5, 2, '2024-25', 3, '2024-07-01', 'ACTIVE');

-- Create sample assessments
INSERT INTO assessments (name, assessment_type, subject_id, max_marks, weightage, assessment_date, academic_year, description)
VALUES
('Internal Exam 1', 'INTERNAL', 1, 30.00, 15.00, '2024-09-15', '2024-25', 'First internal examination'),
('Assignment 1', 'ASSIGNMENT', 1, 10.00, 5.00, '2024-08-20', '2024-25', 'First programming assignment'),
('Lab Practical 1', 'LAB', 1, 20.00, 10.00, '2024-09-01', '2024-25', 'First lab practical'),
('Internal Exam 1', 'INTERNAL', 2, 30.00, 15.00, '2024-09-20', '2024-25', 'First internal examination');

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify table creation
-- SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'uni_marks_db' ORDER BY TABLE_NAME;

-- Verify roles
-- SELECT * FROM roles;

-- Verify departments
-- SELECT * FROM departments;

-- Verify users
-- SELECT id, email, first_name, last_name, employee_id, student_id, role_id, department_id FROM users;

-- Verify subjects
-- SELECT * FROM subjects;

-- Verify foreign key relationships
-- SELECT * FROM subject_assignments;
-- SELECT * FROM enrollments;
-- SELECT * FROM assessments;

-- ============================================
-- DEFAULT CREDENTIALS FOR TESTING
-- ============================================
-- All users have password: admin123
-- Super Admin: admin@university.edu
-- HOD: hod.cse@university.edu
-- Lecturer: lecturer1@university.edu
-- Student 1: student1@university.edu
-- Student 2: student2@university.edu
-- ============================================
