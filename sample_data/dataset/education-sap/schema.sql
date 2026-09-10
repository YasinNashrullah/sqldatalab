-- SAP Academic System Database Schema
-- Generated: 2026-09-09
-- Description: Simplified academic records with students and enrollments

-- =============================================================================
-- TABLE: students
-- Description: Student profiles with faculty, major, GPA and scholarship status
-- =============================================================================
CREATE TABLE students (
    student_id INTEGER PRIMARY KEY,
    student_name VARCHAR(100) NOT NULL,
    faculty VARCHAR(100),
    major VARCHAR(100),
    current_semester INTEGER,
    current_gpa DECIMAL(3,2),
    scholarship_awardee VARCHAR(3)
);

-- =============================================================================
-- TABLE: enrollments
-- Description: Course enrollment records with term, grade, and attendance
-- =============================================================================
CREATE TABLE enrollments (
    enrollment_id VARCHAR(20) PRIMARY KEY,
    student_id INTEGER NOT NULL,
    course_id VARCHAR(20),
    academic_term VARCHAR(20),
    final_grade VARCHAR(5),
    attendance_pct DECIMAL(5,2),
    
    -- Foreign Keys
    FOREIGN KEY (student_id) REFERENCES students(student_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_term ON enrollments(academic_term);
CREATE INDEX idx_students_faculty ON students(faculty);
CREATE INDEX idx_students_gpa ON students(current_gpa);
