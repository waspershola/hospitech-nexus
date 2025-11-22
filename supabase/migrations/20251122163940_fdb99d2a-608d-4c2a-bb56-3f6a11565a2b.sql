-- PHASE-2: Add assigned_at field for staff assignment tracking
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS assigned_at timestamp with time zone;

-- Create index for efficient filtering of assigned requests
CREATE INDEX IF NOT EXISTS idx_requests_assigned_at 
ON requests(tenant_id, assigned_at) 
WHERE assigned_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN requests.assigned_at IS 'Timestamp when request was assigned to a staff member';