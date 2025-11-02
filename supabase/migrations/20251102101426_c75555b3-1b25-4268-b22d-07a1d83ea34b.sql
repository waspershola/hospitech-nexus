-- Phase 3: Fix Duplicate Wallet Creation
-- Remove duplicate trigger (keep only guest_wallet_trigger)

DROP TRIGGER IF EXISTS trigger_create_guest_wallet ON guests;

-- Clean up duplicate wallets and merge balances
WITH duplicate_wallets AS (
  SELECT 
    owner_id,
    MIN(created_at) as oldest_created_at,
    array_agg(id ORDER BY created_at) as all_wallet_ids,
    SUM(balance) as total_balance
  FROM wallets
  WHERE wallet_type = 'guest'
  GROUP BY owner_id
  HAVING COUNT(*) > 1
)
-- Update the oldest wallet with merged balance
UPDATE wallets w
SET 
  balance = dw.total_balance,
  updated_at = now()
FROM duplicate_wallets dw
WHERE w.owner_id = dw.owner_id 
  AND w.wallet_type = 'guest'
  AND w.created_at = dw.oldest_created_at;

-- Delete duplicate wallets (keep only the oldest one per guest)
WITH duplicate_wallets AS (
  SELECT 
    owner_id,
    MIN(created_at) as oldest_created_at
  FROM wallets
  WHERE wallet_type = 'guest'
  GROUP BY owner_id
  HAVING COUNT(*) > 1
)
DELETE FROM wallets w
WHERE w.wallet_type = 'guest'
  AND EXISTS (
    SELECT 1 
    FROM duplicate_wallets dw 
    WHERE dw.owner_id = w.owner_id 
      AND w.created_at > dw.oldest_created_at
  );