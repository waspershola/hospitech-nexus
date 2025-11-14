-- Add missing waived_at column to platform_fee_ledger
ALTER TABLE platform_fee_ledger 
  ADD COLUMN IF NOT EXISTS waived_at timestamp with time zone;

-- Add comment for documentation
COMMENT ON COLUMN platform_fee_ledger.waived_at IS 
  'Timestamp when the platform fee was waived (auto-waived on booking cancellation or manually waived)';

-- Create index for better query performance on waived fees
CREATE INDEX IF NOT EXISTS idx_platform_fee_ledger_waived_at 
  ON platform_fee_ledger(waived_at) 
  WHERE waived_at IS NOT NULL;