-- Phase 1: Fix platform_users schema - rename 'name' to 'full_name'
-- This aligns with edge function expectations and other code patterns

ALTER TABLE platform_users 
RENAME COLUMN name TO full_name;