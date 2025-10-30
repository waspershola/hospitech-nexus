-- Rollback Pay Later Feature (Corrected Order)
-- Remove credit_deferred type from finance_providers

-- Step 1: Clean up payments that reference Pay Later FIRST (preserve payment records)
UPDATE payments 
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"original_provider": "pay_later"}'::jsonb
WHERE method = 'credit_deferred' OR payment_type = 'pay_later';

-- Update method for any credit_deferred payments to 'other'
UPDATE payments 
SET method = 'other'
WHERE method = 'credit_deferred';

-- Step 2: Clean up orphaned provider rules that reference Pay Later providers
DELETE FROM finance_provider_rules 
WHERE provider_id IN (SELECT id FROM finance_providers WHERE type = 'credit_deferred' OR name = 'Pay Later');

-- Step 3: Delete all Pay Later providers
DELETE FROM finance_providers 
WHERE type = 'credit_deferred' OR name = 'Pay Later';

-- Step 4: Remove existing constraint
ALTER TABLE finance_providers 
DROP CONSTRAINT IF EXISTS finance_providers_type_check;

-- Step 5: Add constraint without credit_deferred
ALTER TABLE finance_providers
ADD CONSTRAINT finance_providers_type_check 
CHECK (type IN ('pos', 'online', 'transfer', 'cash'));

-- Step 6: Update column comment
COMMENT ON COLUMN finance_providers.type IS 'Provider type: pos, online, transfer, cash';