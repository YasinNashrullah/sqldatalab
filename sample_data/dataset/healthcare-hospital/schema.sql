-- Hospital Management Database Schema
-- Generated: 2026-09-09
-- Description: Healthcare system with patients, doctors, and admission records

-- =============================================================================
-- TABLE: patients
-- Description: Patient master data with demographics and medical info
-- =============================================================================
CREATE TABLE patients (
    patient_id VARCHAR(20) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    gender VARCHAR(10),
    birth_date DATE,
    blood_type VARCHAR(5),
    phone_number VARCHAR(20)
);

-- =============================================================================
-- TABLE: doctors
-- Description: Medical staff profiles with specialization and department
-- =============================================================================
CREATE TABLE doctors (
    doctor_id VARCHAR(20) PRIMARY KEY,
    doctor_name VARCHAR(100) NOT NULL,
    specialization VARCHAR(100),
    department VARCHAR(100),
    room_number VARCHAR(20)
);

-- =============================================================================
-- TABLE: admissions
-- Description: Patient admission records with diagnosis, stay duration, and billing
-- =============================================================================
CREATE TABLE admissions (
    admission_id VARCHAR(20) PRIMARY KEY,
    patient_id VARCHAR(20) NOT NULL,
    doctor_id VARCHAR(20) NOT NULL,
    admission_date DATE NOT NULL,
    discharge_date DATE,
    diagnosis VARCHAR(200),
    length_of_stay_days INTEGER,
    total_cost_idr DECIMAL(12,2),
    insurance_covered_idr DECIMAL(12,2),
    payment_type VARCHAR(50),
    
    -- Foreign Keys
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX idx_admissions_patient ON admissions(patient_id);
CREATE INDEX idx_admissions_doctor ON admissions(doctor_id);
CREATE INDEX idx_admissions_date ON admissions(admission_date);
CREATE INDEX idx_doctors_specialization ON doctors(specialization);
