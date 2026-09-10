-- University Academic System Database Schema
-- Generated: 2026-09-09
-- Description: Comprehensive university system with students, courses, and enrollments

-- =============================================================================
-- TABLE: students
-- Description: Student profiles with faculty, major, current semester, and GPA
-- =============================================================================
CREATE TABLE students (
    student_id VARCHAR(20) PRIMARY KEY,
    student_name VARCHAR(100) NOT NULL,
    faculty VARCHAR(100),
    major VARCHAR(100),
    current_semester INTEGER,
    current_gpa DECIMAL(3,2),
    scholarship_awardee VARCHAR(3)
);

-- =============================================================================
-- TABLE: courses
-- Description: Course catalog with department, credits, and semester offered
-- =============================================================================
CREATE TABLE courses (
    course_id VARCHAR(20) PRIMARY KEY,
    course_name VARCHAR(150) NOT NULL,
    credits INTEGER,
    department VARCHAR(100),
    semester_offered INTEGER
);

-- =============================================================================
-- TABLE: enrollments
-- Description: Student course registrations with academic term, grade, and attendance
-- =============================================================================
CREATE TABLE enrollments (
    enrollment_id VARCHAR(20) PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL,
    course_id VARCHAR(20) NOT NULL,
    academic_term VARCHAR(30),
    final_grade VARCHAR(5),
    attendance_pct DECIMAL(5,2),
    
    -- Foreign Keys
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (course_id) REFERENCES courses(course_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_enrollments_term ON enrollments(academic_term);
CREATE INDEX idx_students_faculty ON students(faculty);
CREATE INDEX idx_courses_department ON courses(department);
CREATE INDEX idx_students_gpa ON students(current_gpa);
