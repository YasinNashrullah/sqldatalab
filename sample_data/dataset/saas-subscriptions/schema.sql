-- SaaS Subscriptions Database Schema
-- Generated: 2026-09-09
-- Description: SaaS business model with pricing plans, subscriptions, and invoices

-- =============================================================================
-- TABLE: plans
-- Description: Subscription plan catalog with pricing and seat limits
-- =============================================================================
CREATE TABLE plans (
    plan_id VARCHAR(20) PRIMARY KEY,
    plan_name VARCHAR(100) NOT NULL,
    monthly_price_usd INTEGER,
    seat_limit INTEGER,
    target_audience VARCHAR(150)
);

-- =============================================================================
-- TABLE: subscriptions
-- Description: Active and historical subscription records with seat counts
-- =============================================================================
CREATE TABLE subscriptions (
    subscription_id VARCHAR(20) PRIMARY KEY,
    company_name VARCHAR(150) NOT NULL,
    plan_id VARCHAR(20) NOT NULL,
    seats_purchased INTEGER,
    start_date DATE NOT NULL,
    renewal_date DATE,
    status VARCHAR(20)
);

-- =============================================================================
-- TABLE: invoices
-- Description: Invoice records for subscription payments
-- =============================================================================
CREATE TABLE invoices (
    invoice_id VARCHAR(20) PRIMARY KEY,
    subscription_id VARCHAR(20) NOT NULL,
    invoice_date DATE NOT NULL,
    amount_usd INTEGER,
    payment_status VARCHAR(20)
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX idx_subscriptions_plan ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_start ON subscriptions(start_date);
CREATE INDEX idx_invoices_subscription ON invoices(subscription_id);
CREATE INDEX idx_invoices_status ON invoices(payment_status);
