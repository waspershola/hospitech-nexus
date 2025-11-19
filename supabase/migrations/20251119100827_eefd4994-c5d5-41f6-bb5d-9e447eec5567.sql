-- Phase 5: Finance Reports Module - Analytical Views (Drop and Recreate)
-- Drop existing views if they exist
DROP VIEW IF EXISTS v_daily_revenue CASCADE;
DROP VIEW IF EXISTS v_department_revenue CASCADE;
DROP VIEW IF EXISTS v_outstanding_summary CASCADE;

-- View 1: Daily Revenue Summary
-- Aggregates daily payment totals by method
CREATE VIEW v_daily_revenue AS
SELECT 
  p.tenant_id,
  DATE(p.created_at) as report_date,
  COUNT(p.id) as payment_count,
  SUM(p.amount) as total_revenue,
  COUNT(DISTINCT p.booking_id) as unique_bookings,
  COUNT(DISTINCT b.guest_id) as unique_guests
FROM payments p
LEFT JOIN bookings b ON b.id = p.booking_id
WHERE p.status = 'success'
GROUP BY p.tenant_id, DATE(p.created_at);

COMMENT ON VIEW v_daily_revenue IS 'Daily revenue summary aggregated by date';

-- View 2: Department Revenue Summary
-- Aggregates revenue by department from folio transactions
CREATE VIEW v_department_revenue AS
SELECT 
  ft.tenant_id,
  DATE(ft.created_at) as report_date,
  COALESCE(ft.department, 'unassigned') as department,
  SUM(ft.amount) FILTER (WHERE ft.transaction_type = 'charge') as revenue,
  COUNT(*) FILTER (WHERE ft.transaction_type = 'charge') as transaction_count,
  SUM(ft.amount) FILTER (WHERE ft.transaction_type = 'payment') as payments_received
FROM folio_transactions ft
GROUP BY ft.tenant_id, DATE(ft.created_at), ft.department;

COMMENT ON VIEW v_department_revenue IS 'Revenue breakdown by department from folio transactions';

-- View 3: Outstanding Summary
-- Calculates total outstanding balances from open folios
CREATE VIEW v_outstanding_summary AS
SELECT 
  sf.tenant_id,
  COUNT(sf.id) as open_folios_count,
  SUM(sf.balance) as total_outstanding,
  SUM(sf.balance) FILTER (WHERE sf.balance > 0) as positive_balance_total,
  SUM(sf.balance) FILTER (WHERE sf.balance < 0) as negative_balance_total,
  AVG(sf.balance) as avg_balance,
  MAX(sf.balance) as max_balance,
  MIN(sf.balance) as min_balance
FROM stay_folios sf
WHERE sf.status = 'open'
GROUP BY sf.tenant_id;

COMMENT ON VIEW v_outstanding_summary IS 'Summary of outstanding balances from open folios';