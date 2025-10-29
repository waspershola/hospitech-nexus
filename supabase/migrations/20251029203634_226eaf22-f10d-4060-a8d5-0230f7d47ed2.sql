-- Auto-create guest wallet on guest creation
CREATE OR REPLACE FUNCTION create_guest_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (tenant_id, wallet_type, owner_id, name, currency, balance)
  VALUES (NEW.tenant_id, 'guest', NEW.id, NEW.name, 'NGN', 0)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic wallet creation
DROP TRIGGER IF EXISTS guest_wallet_trigger ON guests;
CREATE TRIGGER guest_wallet_trigger
AFTER INSERT ON guests
FOR EACH ROW
EXECUTE FUNCTION create_guest_wallet();

-- Backfill existing guests without wallets
INSERT INTO wallets (tenant_id, wallet_type, owner_id, name, currency, balance)
SELECT DISTINCT g.tenant_id, 'guest', g.id, g.name, 'NGN', 0
FROM guests g
LEFT JOIN wallets w ON w.owner_id = g.id AND w.wallet_type = 'guest'
WHERE w.id IS NULL
ON CONFLICT DO NOTHING;