-- Retail Inventory Database Schema
-- Generated: 2026-09-09
-- Description: Multi-store retail system with inventory tracking across locations

-- =============================================================================
-- TABLE: suppliers
-- Description: Supplier master data
-- =============================================================================
CREATE TABLE suppliers (
    supplier_id VARCHAR(20) PRIMARY KEY,
    supplier_name VARCHAR(150) NOT NULL,
    city VARCHAR(100),
    lead_time_days INTEGER,
    vendor_rating DECIMAL(3,1)
);

-- =============================================================================
-- TABLE: products
-- Description: Product catalog with category and pricing
-- =============================================================================
CREATE TABLE products (
    sku VARCHAR(20) PRIMARY KEY,
    product_name VARCHAR(150) NOT NULL,
    category VARCHAR(50),
    retail_price_idr DECIMAL(12,2)
);

-- =============================================================================
-- TABLE: inventory
-- Description: Stock levels per store-product combination with reorder tracking
-- =============================================================================
CREATE TABLE inventory (
    inventory_id VARCHAR(20) PRIMARY KEY,
    sku VARCHAR(20),
    supplier_id VARCHAR(20),
    warehouse_shelf VARCHAR(50),
    current_stock INTEGER,
    reorder_point INTEGER,
    unit_cost_idr DECIMAL(12,2),
    stock_status VARCHAR(30)
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX idx_inventory_stock ON inventory(current_stock);
CREATE INDEX idx_inventory_status ON inventory(stock_status);
CREATE INDEX idx_inventory_supplier ON inventory(supplier_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_suppliers_city ON suppliers(city);
