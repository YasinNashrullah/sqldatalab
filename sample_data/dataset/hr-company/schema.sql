-- HR Company Database Schema
-- Generated: 2026-09-09
-- Description: Human resources system with employees, departments, and salary records

-- =============================================================================
-- TABLE: employees
-- Description: Employee profiles with department, position, and manager hierarchy
-- =============================================================================
CREATE TABLE employees (
    employee_id VARCHAR(20) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    department_id VARCHAR(20),
    job_title VARCHAR(100),
    hire_date DATE,
    work_mode VARCHAR(20),
    performance_score DECIMAL(4,2),
    status VARCHAR(20)
);

-- =============================================================================
-- TABLE: departments
-- Description: Department master data with location and assigned manager
-- =============================================================================
CREATE TABLE departments (
    department_id VARCHAR(20) PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL,
    head_of_department VARCHAR(100),
    annual_budget_idr DECIMAL(15,2),
    office_floor VARCHAR(20)
);

-- =============================================================================
-- TABLE: salaries
-- Description: Historical salary records with base pay, bonus, and total compensation
-- =============================================================================
CREATE TABLE salaries (
    salary_id VARCHAR(20) PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL,
    base_salary_idr DECIMAL(15,2),
    performance_bonus_idr DECIMAL(15,2),
    tax_deductions_idr DECIMAL(15,2),
    net_salary_idr DECIMAL(15,2),
    pay_frequency VARCHAR(20)
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_salaries_employee ON salaries(employee_id);
