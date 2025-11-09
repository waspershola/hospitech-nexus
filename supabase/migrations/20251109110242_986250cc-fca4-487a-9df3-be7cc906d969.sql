-- Drop existing unique constraint on tenants.slug
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_slug_key;

-- Create partial unique index that only applies to non-deleted tenants
-- This allows slug reuse after soft deletion
CREATE UNIQUE INDEX tenants_slug_key ON tenants(slug) WHERE deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON INDEX tenants_slug_key IS 'Ensures slug uniqueness only for active (non-deleted) tenants, allowing slug reuse after soft deletion';