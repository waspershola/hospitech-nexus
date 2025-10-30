-- Phase 1: Auto-create organization wallets and backfill existing ones

-- 1. Create trigger function to auto-create organization wallets
CREATE OR REPLACE FUNCTION create_organization_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_wallet_id uuid;
BEGIN
  -- Create wallet for the new organization
  INSERT INTO wallets (
    tenant_id,
    wallet_type,
    owner_id,
    name,
    currency,
    balance
  )
  VALUES (
    NEW.tenant_id,
    'organization',
    NEW.id,
    NEW.name || '''s Wallet',
    'NGN',
    0
  )
  RETURNING id INTO new_wallet_id;
  
  -- Update organization with wallet_id
  NEW.wallet_id = new_wallet_id;
  
  RETURN NEW;
END;
$$;

-- 2. Create trigger
CREATE TRIGGER on_organization_created
  BEFORE INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_organization_wallet();

-- 3. Backfill existing organizations without wallets
INSERT INTO wallets (tenant_id, wallet_type, owner_id, name, currency, balance)
SELECT 
  o.tenant_id,
  'organization',
  o.id,
  o.name || '''s Wallet',
  'NGN',
  0
FROM organizations o
WHERE o.wallet_id IS NULL
ON CONFLICT DO NOTHING;

-- 4. Update organizations with their new wallet IDs
UPDATE organizations o
SET wallet_id = w.id
FROM wallets w
WHERE w.owner_id = o.id 
  AND w.wallet_type = 'organization'
  AND o.wallet_id IS NULL;