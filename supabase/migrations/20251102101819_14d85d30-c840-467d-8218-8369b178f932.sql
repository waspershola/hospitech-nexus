-- Phase 1: Fix Duplicate Wallets (Robust Cleanup)

-- Step 1: Merge balances and keep oldest wallet per guest
WITH duplicate_wallets AS (
  SELECT 
    owner_id,
    MIN(created_at) as oldest_created_at,
    SUM(balance) as total_balance,
    COUNT(*) as wallet_count
  FROM wallets
  WHERE wallet_type = 'guest'
  GROUP BY owner_id
  HAVING COUNT(*) > 1
),
oldest_wallets AS (
  SELECT DISTINCT ON (w.owner_id) 
    w.id as wallet_id,
    w.owner_id,
    dw.total_balance
  FROM wallets w
  INNER JOIN duplicate_wallets dw ON w.owner_id = dw.owner_id
  WHERE w.wallet_type = 'guest'
  ORDER BY w.owner_id, w.created_at ASC
)
UPDATE wallets w
SET 
  balance = ow.total_balance,
  updated_at = now()
FROM oldest_wallets ow
WHERE w.id = ow.wallet_id;

-- Step 2: Delete duplicate wallets (keep only oldest)
WITH oldest_wallets AS (
  SELECT DISTINCT ON (owner_id) 
    id as keep_id
  FROM wallets
  WHERE wallet_type = 'guest'
  ORDER BY owner_id, created_at ASC
)
DELETE FROM wallets w
WHERE w.wallet_type = 'guest'
  AND w.id NOT IN (SELECT keep_id FROM oldest_wallets);

-- Step 3: Add unique constraint to prevent future duplicates
ALTER TABLE wallets
DROP CONSTRAINT IF EXISTS unique_guest_wallet;

ALTER TABLE wallets
ADD CONSTRAINT unique_guest_wallet 
UNIQUE (owner_id, wallet_type, tenant_id);

-- Step 4: Create index for faster wallet lookups
CREATE INDEX IF NOT EXISTS idx_wallets_guest_lookup 
ON wallets(owner_id, wallet_type) 
WHERE wallet_type = 'guest';