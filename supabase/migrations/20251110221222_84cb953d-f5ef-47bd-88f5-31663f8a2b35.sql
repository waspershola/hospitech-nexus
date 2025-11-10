-- Approve all pending menu items for this tenant
UPDATE menu_items 
SET 
  status = 'approved',
  approved_by = (SELECT id FROM auth.users WHERE email = 'shola@gmail.com'),
  approved_at = NOW()
WHERE 
  tenant_id = '2fcf4518-e7d8-4f4a-ac03-8a24f6cdf7ec' 
  AND status = 'pending_approval';