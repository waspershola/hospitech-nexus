-- Phase 2: Add credit_deferred to finance_providers type constraint
-- First, drop the existing check constraint
ALTER TABLE finance_providers 
DROP CONSTRAINT IF EXISTS finance_providers_type_check;

-- Add new check constraint with credit_deferred included
ALTER TABLE finance_providers
ADD CONSTRAINT finance_providers_type_check 
CHECK (type IN ('pos', 'online', 'transfer', 'cash', 'credit_deferred'));

-- Update existing Pay Later providers to credit_deferred type
UPDATE finance_providers
SET 
  type = 'credit_deferred',
  meta = jsonb_set(
    COALESCE(meta, '{}'::jsonb),
    '{accounting_impact}',
    '{"debit": "accounts_receivable", "credit": "revenue"}'::jsonb
  )
WHERE name = 'Pay Later';

-- Add comment for documentation
COMMENT ON COLUMN finance_providers.type IS 'Provider type: pos, online, transfer, cash, credit_deferred. credit_deferred is for internal credit/deferred payment systems like Pay Later';