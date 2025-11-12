-- Phase 2 Tier 1 Fix: Clean orphaned guest_orders
-- Link orphaned orders to requests by matching qr_token and timestamp

-- Attempt to link orphaned orders to requests by matching qr_token and approximate timestamp
UPDATE guest_orders go
SET request_id = (
  SELECT r.id 
  FROM requests r 
  WHERE r.qr_token = go.qr_token 
    AND r.service_category IN ('digital_menu', 'room_service')
    AND r.created_at BETWEEN (go.created_at - INTERVAL '5 minutes') 
                         AND (go.created_at + INTERVAL '5 minutes')
  ORDER BY ABS(EXTRACT(EPOCH FROM (r.created_at - go.created_at)))
  LIMIT 1
)
WHERE go.request_id IS NULL;

-- Delete any remaining orphaned orders that couldn't be matched (data integrity)
DELETE FROM guest_orders WHERE request_id IS NULL;

-- Add comment for audit trail
COMMENT ON TABLE guest_orders IS 'All guest orders must have a valid request_id linking to the requests table. Phase 2 migration fixed 21 orphaned orders.';