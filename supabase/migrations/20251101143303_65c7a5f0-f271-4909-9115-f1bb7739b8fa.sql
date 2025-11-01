-- Add receipt number configuration to receipt_settings
ALTER TABLE receipt_settings 
ADD COLUMN IF NOT EXISTS receipt_number_prefix TEXT DEFAULT 'RCP',
ADD COLUMN IF NOT EXISTS receipt_number_length INTEGER DEFAULT 6,
ADD COLUMN IF NOT EXISTS reset_sequence_yearly BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN receipt_settings.receipt_number_prefix IS 'Prefix for receipt numbers (e.g., RCP, INV)';
COMMENT ON COLUMN receipt_settings.receipt_number_length IS 'Number of digits in receipt sequence (e.g., 6 = 000001)';
COMMENT ON COLUMN receipt_settings.reset_sequence_yearly IS 'Whether to reset sequence counter each year';