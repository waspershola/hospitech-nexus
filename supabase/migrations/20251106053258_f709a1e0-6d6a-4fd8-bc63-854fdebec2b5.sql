-- Enable RLS on onboarding tables
ALTER TABLE tenant_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_onboarding_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant_onboarding
CREATE POLICY "Platform admins can manage all onboarding"
  ON tenant_onboarding
  FOR ALL
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "Tenants can view their own onboarding"
  ON tenant_onboarding
  FOR SELECT
  USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Tenants can update their own onboarding"
  ON tenant_onboarding
  FOR UPDATE
  USING (tenant_id = get_user_tenant(auth.uid()));

-- RLS policies for tenant_onboarding_tasks
CREATE POLICY "Platform admins can manage all tasks"
  ON tenant_onboarding_tasks
  FOR ALL
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "Tenants can view their own tasks"
  ON tenant_onboarding_tasks
  FOR SELECT
  USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Tenants can update their own tasks"
  ON tenant_onboarding_tasks
  FOR UPDATE
  USING (tenant_id = get_user_tenant(auth.uid()));