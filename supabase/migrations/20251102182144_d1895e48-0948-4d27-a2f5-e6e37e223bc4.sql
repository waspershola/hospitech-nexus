-- PHASE 1: Add new roles to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'finance';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'maintenance';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'restaurant';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'bar';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'accountant';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'supervisor';