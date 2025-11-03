-- Add missing app_role enum values for complete department coverage
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'spa';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'concierge';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'hr';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'limited_ops';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'guest_portal_access';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'store_user';