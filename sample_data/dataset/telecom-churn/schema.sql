-- Telecommunications Churn Database Schema
-- Generated: 2026-09-09
-- Description: Telecom customer data with service catalog and churn tracking

-- =============================================================================
-- TABLE: customers
-- Description: Customer demographics with join date
-- =============================================================================
CREATE TABLE customers (
    customer_id VARCHAR(20) PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    gender VARCHAR(10),
    city VARCHAR(100),
    join_date DATE
);

-- =============================================================================
-- TABLE: services
-- Description: Service catalog with categories and pricing
-- =============================================================================
CREATE TABLE services (
    service_id VARCHAR(20) PRIMARY KEY,
    service_name VARCHAR(150) NOT NULL,
    category VARCHAR(50),
    monthly_fee_idr DECIMAL(12,2)
);

-- =============================================================================
-- TABLE: churn_records
-- Description: Customer churn analysis records with contract and tenure details
-- =============================================================================
CREATE TABLE churn_records (
    record_id VARCHAR(20) PRIMARY KEY,
    customer_id VARCHAR(20) NOT NULL,
    contract_type VARCHAR(50),
    monthly_charges_idr DECIMAL(12,2),
    tenure_months INTEGER,
    has_churned VARCHAR(3),
    churn_risk_score DECIMAL(4,2),
    
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX idx_churn_records_customer ON churn_records(customer_id);
CREATE INDEX idx_churn_records_status ON churn_records(has_churned);
CREATE INDEX idx_churn_records_tenure ON churn_records(tenure_months);
CREATE INDEX idx_churn_records_contract ON churn_records(contract_type);
CREATE INDEX idx_customers_city ON customers(city);
CREATE INDEX idx_services_category ON services(category);
