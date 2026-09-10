-- Migration: Add is_demo column to users table
-- Date: 2026-09-10
-- Description: Add is_demo field to differentiate demo accounts (max 1 workspace) from regular accounts (max 3 workspaces)

-- Add is_demo column with default value FALSE
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

-- Set existing analyst_pro user as demo account
UPDATE users SET is_demo = TRUE WHERE username = 'analyst_pro';

-- Verify the migration
SELECT username, email, is_demo FROM users;
