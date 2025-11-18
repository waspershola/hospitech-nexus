-- Phase 2: Post-Checkout Ledger System
-- Migration: Create post_checkout_ledger table for payments after checkout

CREATE TABLE IF NOT EXISTS post_checkout_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES bookings(id),
  payment_id uuid NOT NULL REFERENCES payments(id) UNIQUE,
  guest_id uuid REFERENCES guests(id),
  amount numeric NOT NULL,
  reason text NOT NULL CHECK (reason IN ('late_payment', 'correction', 'adjustment', 'refund_reversal')),
  notes text,
  recorded_by uuid,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT positive_amount CHECK (amount > 0)
);

CREATE INDEX idx_post_checkout_ledger_tenant ON post_checkout_ledger(tenant_id);
CREATE INDEX idx_post_checkout_ledger_booking ON post_checkout_ledger(booking_id);
CREATE INDEX idx_post_checkout_ledger_payment ON post_checkout_ledger(payment_id);
CREATE INDEX idx_post_checkout_ledger_date ON post_checkout_ledger(created_at DESC);

COMMENT ON TABLE post_checkout_ledger IS 'Records payments received after booking checkout';
COMMENT ON COLUMN post_checkout_ledger.reason IS 'Reason for post-checkout payment: late_payment, correction, adjustment, refund_reversal';

-- RLS Policies
ALTER TABLE post_checkout_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their post-checkout ledger"
ON post_checkout_ledger FOR SELECT
USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Staff can insert post-checkout ledger entries"
ON post_checkout_ledger FOR INSERT
WITH CHECK (tenant_id = get_user_tenant(auth.uid()));


-- Phase 3: Finance Report Views
-- Create materialized views for fast report generation

CREATE OR REPLACE VIEW v_daily_revenue AS
SELECT 
  tenant_id,
  DATE(created_at) as report_date,
  COUNT(*) as payment_count,
  SUM(amount) as total_revenue,
  COUNT(DISTINCT booking_id) FILTER (WHERE booking_id IS NOT NULL) as unique_bookings,
  COUNT(DISTINCT guest_id) FILTER (WHERE guest_id IS NOT NULL) as unique_guests
FROM payments
WHERE status = 'completed'
GROUP BY tenant_id, DATE(created_at);

COMMENT ON VIEW v_daily_revenue IS 'Daily revenue summary for quick reporting';


CREATE OR REPLACE VIEW v_department_revenue AS
SELECT 
  tenant_id,
  department,
  DATE(created_at) as report_date,
  SUM(amount) as revenue,
  COUNT(*) as transaction_count
FROM payments
WHERE status = 'completed' AND department IS NOT NULL
GROUP BY tenant_id, department, DATE(created_at);

COMMENT ON VIEW v_department_revenue IS 'Revenue breakdown by department';


CREATE OR REPLACE VIEW v_outstanding_summary AS
SELECT 
  sf.tenant_id,
  COUNT(*) as folio_count,
  SUM(sf.balance) as total_outstanding,
  AVG(sf.balance) as avg_balance,
  MAX(sf.balance) as max_balance
FROM stay_folios sf
WHERE sf.status = 'open' AND sf.balance > 0
GROUP BY sf.tenant_id;

COMMENT ON VIEW v_outstanding_summary IS 'Summary of outstanding folio balances';


-- Phase 7: Night Audit System Tables

CREATE TABLE IF NOT EXISTS night_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  audit_date date NOT NULL,
  cutoff_time timestamptz NOT NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL CHECK (status IN ('running', 'completed', 'failed')) DEFAULT 'running',
  run_by uuid,
  total_revenue numeric,
  total_folios_processed integer DEFAULT 0,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_audit_per_date UNIQUE (tenant_id, audit_date)
);

CREATE INDEX idx_night_audit_runs_tenant ON night_audit_runs(tenant_id);
CREATE INDEX idx_night_audit_runs_date ON night_audit_runs(audit_date DESC);
CREATE INDEX idx_night_audit_runs_status ON night_audit_runs(status);

COMMENT ON TABLE night_audit_runs IS 'Records of night audit execution runs';


CREATE TABLE IF NOT EXISTS night_audit_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_run_id uuid NOT NULL REFERENCES night_audit_runs(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  report_type text NOT NULL CHECK (report_type IN (
    'daily_summary',
    'revenue_by_department',
    'occupancy',
    'arrivals_departures',
    'ledger_summary',
    'folio_closures',
    'post_checkout_payments'
  )),
  report_data jsonb NOT NULL,
  pdf_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_night_audit_reports_run ON night_audit_reports(audit_run_id);
CREATE INDEX idx_night_audit_reports_tenant ON night_audit_reports(tenant_id);
CREATE INDEX idx_night_audit_reports_type ON night_audit_reports(report_type);

COMMENT ON TABLE night_audit_reports IS 'Detailed reports generated during night audit';

-- RLS Policies for Night Audit
ALTER TABLE night_audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE night_audit_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their audit runs"
ON night_audit_runs FOR SELECT
USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Managers can create audit runs"
ON night_audit_runs FOR INSERT
WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Tenants can view their audit reports"
ON night_audit_reports FOR SELECT
USING (tenant_id = get_user_tenant(auth.uid()));