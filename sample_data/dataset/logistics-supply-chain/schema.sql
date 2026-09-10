-- Logistics Supply Chain Database Schema
-- Generated: 2026-09-09
-- Description: Logistics system with hubs, carriers, and shipment tracking

-- =============================================================================
-- TABLE: warehouses
-- Description: Distribution hub locations with capacity information
-- =============================================================================
CREATE TABLE warehouses (
    hub_id VARCHAR(20) PRIMARY KEY,
    hub_name VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    province VARCHAR(100),
    capacity_sqm INTEGER
);

-- =============================================================================
-- TABLE: carriers
-- Description: Logistics carrier partners with service types and ratings
-- =============================================================================
CREATE TABLE carriers (
    carrier_id VARCHAR(20) PRIMARY KEY,
    carrier_name VARCHAR(100) NOT NULL,
    service_type VARCHAR(100),
    customer_rating DECIMAL(3,1),
    hotline VARCHAR(50)
);

-- =============================================================================
-- TABLE: shipments
-- Description: Shipment tracking records with origin, destination, and delivery metrics
-- =============================================================================
CREATE TABLE shipments (
    tracking_no VARCHAR(20) PRIMARY KEY,
    origin_hub_id VARCHAR(20) NOT NULL,
    dest_hub_id VARCHAR(20) NOT NULL,
    carrier_id VARCHAR(20) NOT NULL,
    weight_kg DECIMAL(10,2),
    shipping_cost_idr DECIMAL(12,2),
    shipment_date DATE NOT NULL,
    est_days INTEGER,
    actual_days INTEGER,
    delivery_status VARCHAR(20),
    is_delayed VARCHAR(3),
    
    -- Foreign Keys
    FOREIGN KEY (origin_hub_id) REFERENCES warehouses(hub_id),
    FOREIGN KEY (dest_hub_id) REFERENCES warehouses(hub_id),
    FOREIGN KEY (carrier_id) REFERENCES carriers(carrier_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX idx_shipments_origin ON shipments(origin_hub_id);
CREATE INDEX idx_shipments_dest ON shipments(dest_hub_id);
CREATE INDEX idx_shipments_carrier ON shipments(carrier_id);
CREATE INDEX idx_shipments_date ON shipments(shipment_date);
CREATE INDEX idx_shipments_status ON shipments(delivery_status);
CREATE INDEX idx_warehouses_city ON warehouses(city);
