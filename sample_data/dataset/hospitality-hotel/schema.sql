-- Hotel Management Database Schema
-- Generated: 2026-09-09
-- Description: Hospitality system with guest profiles, room inventory, and bookings

-- =============================================================================
-- TABLE: guests
-- Description: Guest profiles with contact information and loyalty program
-- =============================================================================
CREATE TABLE guests (
    guest_id VARCHAR(20) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    nationality VARCHAR(50),
    loyalty_points INTEGER
);

-- =============================================================================
-- TABLE: rooms
-- Description: Hotel room inventory with type, branch, and pricing
-- =============================================================================
CREATE TABLE rooms (
    room_id VARCHAR(20) PRIMARY KEY,
    room_number VARCHAR(20),
    room_type VARCHAR(50) NOT NULL,
    branch_name VARCHAR(100),
    price_per_night_idr DECIMAL(12,2),
    floor INTEGER
);

-- =============================================================================
-- TABLE: bookings
-- Description: Reservation records with check-in dates, nights stayed, and pricing
-- =============================================================================
CREATE TABLE bookings (
    booking_id VARCHAR(20) PRIMARY KEY,
    guest_id VARCHAR(20) NOT NULL,
    room_id VARCHAR(20) NOT NULL,
    checkin_date DATE NOT NULL,
    nights_stayed INTEGER,
    total_price_idr DECIMAL(12,2),
    booking_channel VARCHAR(50),
    booking_status VARCHAR(20),
    
    -- Foreign Keys
    FOREIGN KEY (guest_id) REFERENCES guests(guest_id),
    FOREIGN KEY (room_id) REFERENCES rooms(room_id)
);

-- =============================================================================
-- TABLE: payments
-- Description: Payment transactions with method and transaction timestamps
-- =============================================================================
CREATE TABLE payments (
    payment_id VARCHAR(20) PRIMARY KEY,
    booking_id VARCHAR(20) NOT NULL,
    payment_method VARCHAR(50),
    amount_idr DECIMAL(12,2),
    transaction_date TIMESTAMP,
    payment_status VARCHAR(20),
    
    -- Foreign Keys
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX idx_bookings_guest ON bookings(guest_id);
CREATE INDEX idx_bookings_room ON bookings(room_id);
CREATE INDEX idx_bookings_checkin ON bookings(checkin_date);
CREATE INDEX idx_bookings_status ON bookings(booking_status);
CREATE INDEX idx_rooms_type ON rooms(room_type);
