-- Sync existing tenant from tenants to platform_tenants
-- This migration creates a platform_tenants entry for the existing GARND PALACE2 HOTEL tenant

INSERT INTO platform_tenants (
  id,
  domain,
  owner_email,
  status,
  plan_id,
  created_at,
  updated_at
)
SELECT 
  t.id,
  COALESCE(t.domain, 'garndpalace2.hotel.example'),
  'admin@garndpalace2hotel.com', -- Default email, should be updated by admin
  t.status,
  '8dd55182-2bb5-4364-883e-8b1f951ac92f', -- Starter plan
  t.created_at,
  t.created_at -- Use created_at since updated_at doesn't exist in tenants
FROM tenants t
WHERE t.name = 'GARND PALACE2 HOTEL'
  AND NOT EXISTS (
    SELECT 1 FROM platform_tenants pt WHERE pt.id = t.id
  );

-- Create initial SMS credit pool for the synced tenant
INSERT INTO platform_sms_credit_pool (
  tenant_id,
  total_credits,
  consumed_credits,
  last_topup_at
)
SELECT 
  t.id,
  100, -- 100 trial credits
  0,
  NOW()
FROM tenants t
WHERE t.name = 'GARND PALACE2 HOTEL'
  AND NOT EXISTS (
    SELECT 1 FROM platform_sms_credit_pool p WHERE p.tenant_id = t.id
  );