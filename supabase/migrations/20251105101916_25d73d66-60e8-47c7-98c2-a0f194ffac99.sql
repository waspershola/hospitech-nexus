-- Phase 1A: Add platform roles to app_role enum
-- These must be added in a separate transaction before use

ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'support_admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'billing_bot';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'marketplace_admin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'monitoring_bot';