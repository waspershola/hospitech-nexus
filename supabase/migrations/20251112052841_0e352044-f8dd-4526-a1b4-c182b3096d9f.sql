-- Phase 5: Fix requests.updated_at column and guest_communications RLS policies

-- 1. Add updated_at column to requests table with auto-update trigger
ALTER TABLE requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE OR REPLACE FUNCTION update_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_requests_updated_at ON requests;
CREATE TRIGGER set_requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION update_requests_updated_at();

-- 2. Fix guest_communications RLS policies - Replace FOR ALL with explicit command policies
DROP POLICY IF EXISTS "Staff can manage communications" ON guest_communications;

CREATE POLICY "guest_communications_staff_select"
  ON guest_communications FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "guest_communications_staff_insert"
  ON guest_communications FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "guest_communications_staff_update"
  ON guest_communications FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "guest_communications_staff_delete"
  ON guest_communications FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid()));