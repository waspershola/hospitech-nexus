-- Add fee_bearer column to finance_providers
ALTER TABLE finance_providers 
ADD COLUMN fee_bearer text DEFAULT 'property' CHECK (fee_bearer IN ('property', 'guest'));

-- Add helpful comment
COMMENT ON COLUMN finance_providers.fee_bearer IS 'Who pays the transaction fee: property (hotel absorbs) or guest (adds to total)';