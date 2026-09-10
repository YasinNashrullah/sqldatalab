-- E-Commerce Sales Database Schema
-- Generated: 2026-09-09
-- Description: Basic e-commerce database with customer orders and product catalog

-- =============================================================================
-- TABLE: customers
-- Description: Customer master data including membership tier and location
-- =============================================================================
CREATE TABLE customers (
    customer_id VARCHAR(20) PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    city VARCHAR(100),
    membership_tier VARCHAR(20),
    signup_date DATE
);

-- =============================================================================
-- TABLE: products
-- Description: Product catalog with pricing and inventory stock levels
-- =============================================================================
CREATE TABLE products (
    product_id VARCHAR(20) PRIMARY KEY,
    product_name VARCHAR(150) NOT NULL,
    category VARCHAR(50),
    price DECIMAL(12,2),
    stock INTEGER
);

-- =============================================================================
-- TABLE: orders
-- Description: Order transactions linking customers to products
-- =============================================================================
CREATE TABLE orders (
    order_id VARCHAR(20) PRIMARY KEY,
    customer_id VARCHAR(20) NOT NULL,
    product_id VARCHAR(20) NOT NULL,
    order_date DATE NOT NULL,
    quantity INTEGER NOT NULL,
    total_amount DECIMAL(12,2),
    payment_method VARCHAR(50),
    shipping_city VARCHAR(100),
    order_status VARCHAR(20),
    
    -- Foreign Keys
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- =============================================================================
-- INDEXES (Optional - for performance optimization)
-- =============================================================================
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_product ON orders(product_id);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_orders_status ON orders(order_status);
CREATE INDEX idx_customers_city ON customers(city);
CREATE INDEX idx_products_category ON products(category);
