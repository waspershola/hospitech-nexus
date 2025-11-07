-- Add unique constraint to hotel_configurations for proper upsert behavior
ALTER TABLE hotel_configurations 
ADD CONSTRAINT hotel_configurations_tenant_key_unique 
UNIQUE (tenant_id, key);

-- Verify RLS policies allow proper INSERT/UPDATE for owners and managers
-- (This is informational, existing policies should handle this)