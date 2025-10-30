-- Phase 1: Database Views & Indexes for Finance Overview Dashboard

-- Create Finance Overview Summary View
CREATE OR REPLACE VIEW v_finance_overview_summary AS
SELECT
    wt.tenant_id,
    date_trunc('day', wt.created_at)::date AS transaction_day,
    wt.department,
    fp.name AS provider_name,
    fp.id AS provider_id,
    wt.source,
    wt.type,
    SUM(CASE WHEN wt.type = 'credit' THEN wt.amount ELSE 0 END) AS total_inflow,
    SUM(CASE WHEN wt.type = 'debit' THEN wt.amount ELSE 0 END) AS total_outflow,
    COUNT(*) AS transaction_count,
    (SUM(CASE WHEN wt.type = 'credit' THEN wt.amount ELSE 0 END) -
     SUM(CASE WHEN wt.type = 'debit' THEN wt.amount ELSE 0 END)) AS net_balance,
    MAX(wt.created_at) AS last_transaction_at
FROM wallet_transactions wt
LEFT JOIN payments p ON p.id = wt.payment_id
LEFT JOIN finance_providers fp ON fp.id::text = p.method_provider
GROUP BY wt.tenant_id, transaction_day, wt.department, fp.name, fp.id, wt.source, wt.type
ORDER BY transaction_day DESC;

-- Create Debtors/Creditors View
CREATE OR REPLACE VIEW v_debtors_creditors AS
SELECT
  r.tenant_id,
  'debtor' AS type,
  COALESCE(g.name, o.name) AS entity_name,
  COALESCE(r.guest_id, r.organization_id) AS entity_id,
  CASE WHEN r.guest_id IS NOT NULL THEN 'guest' ELSE 'organization' END AS entity_type,
  SUM(r.amount) AS total_amount,
  MAX(r.updated_at) AS last_activity,
  COUNT(*) AS transaction_count
FROM receivables r
LEFT JOIN guests g ON g.id = r.guest_id
LEFT JOIN organizations o ON o.id = r.organization_id
WHERE r.status = 'open'
GROUP BY r.tenant_id, g.name, o.name, r.guest_id, r.organization_id

UNION ALL

SELECT
  w.tenant_id,
  'creditor' AS type,
  COALESCE(g.name, o.name) AS entity_name,
  w.owner_id AS entity_id,
  w.wallet_type AS entity_type,
  w.balance AS total_amount,
  w.last_transaction_at AS last_activity,
  (SELECT COUNT(*) FROM wallet_transactions wt WHERE wt.wallet_id = w.id) AS transaction_count
FROM wallets w
LEFT JOIN guests g ON g.id = w.owner_id AND w.wallet_type = 'guest'
LEFT JOIN organizations o ON o.id = w.owner_id AND w.wallet_type = 'organization'
WHERE w.balance > 0;

-- Add Performance Indexes
CREATE INDEX IF NOT EXISTS idx_wallet_txn_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_tenant_date ON wallet_transactions(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_department ON wallet_transactions(department);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_type ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_payments_method_provider ON payments(method_provider);

-- Enable Realtime for wallet_transactions (if not already enabled)
ALTER TABLE wallet_transactions REPLICA IDENTITY FULL;