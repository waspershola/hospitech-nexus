-- Add store_manager and procurement roles to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'store_manager';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'procurement';