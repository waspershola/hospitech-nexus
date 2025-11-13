-- Fix mode field for SOLO TINKAN HOTEL to sync with payer='guest'
UPDATE platform_fee_configurations 
SET 
  mode = 'inclusive',
  updated_at = NOW()
WHERE tenant_id = 'cccecb19-81a5-46ef-9cce-5f72e972993f' 
AND payer = 'guest';