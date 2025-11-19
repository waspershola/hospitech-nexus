-- Migration: Enhance Night Audit for Multi-Folio
-- Version: NIGHT-AUDIT-V2

ALTER TABLE night_audit_runs
ADD COLUMN IF NOT EXISTS folios_by_type JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS revenue_by_folio_type JSONB DEFAULT '{}'::JSONB;

ALTER TABLE night_audit_reports
ADD COLUMN IF NOT EXISTS folio_type TEXT,
ADD COLUMN IF NOT EXISTS folio_count INTEGER;

CREATE INDEX IF NOT EXISTS idx_night_audit_reports_folio_type
ON night_audit_reports(audit_run_id, folio_type)
WHERE folio_type IS NOT NULL;

CREATE OR REPLACE FUNCTION calculate_folio_stats_by_type(
  p_tenant_id UUID,
  p_audit_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats JSONB := '{}'::JSONB;
  v_folio_type TEXT;
  v_count INTEGER;
  v_revenue NUMERIC;
BEGIN
  FOR v_folio_type, v_count, v_revenue IN
    SELECT 
      sf.folio_type,
      COUNT(DISTINCT sf.id) AS folio_count,
      COALESCE(SUM(sf.total_charges), 0) AS total_revenue
    FROM stay_folios sf
    JOIN bookings b ON b.id = sf.booking_id
    WHERE sf.tenant_id = p_tenant_id
      AND b.check_in::DATE <= p_audit_date
      AND (b.check_out::DATE >= p_audit_date OR b.status = 'checked_in')
    GROUP BY sf.folio_type
  LOOP
    v_stats := v_stats || jsonb_build_object(
      v_folio_type,
      jsonb_build_object(
        'count', v_count,
        'revenue', v_revenue
      )
    );
  END LOOP;
  
  RETURN v_stats;
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_folio_stats_by_type(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_folio_stats_by_type(UUID, DATE) TO service_role;