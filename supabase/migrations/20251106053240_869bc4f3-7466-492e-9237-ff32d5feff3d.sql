-- Create tenant onboarding tracking table
CREATE TABLE IF NOT EXISTS tenant_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'skipped')),
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 5,
  steps_completed JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Create onboarding tasks table
CREATE TABLE IF NOT EXISTS tenant_onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL,
  task_name TEXT NOT NULL,
  task_description TEXT,
  is_required BOOLEAN DEFAULT true,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, task_key)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_tenant ON tenant_onboarding(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_status ON tenant_onboarding(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_tenant ON tenant_onboarding_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_completed ON tenant_onboarding_tasks(is_completed);

-- Add triggers for updated_at
CREATE TRIGGER update_tenant_onboarding_updated_at
  BEFORE UPDATE ON tenant_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_updated_at();

CREATE TRIGGER update_tenant_onboarding_tasks_updated_at
  BEFORE UPDATE ON tenant_onboarding_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_updated_at();

-- Function to initialize onboarding for a new tenant
CREATE OR REPLACE FUNCTION initialize_tenant_onboarding(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Create onboarding record
  INSERT INTO tenant_onboarding (tenant_id, status, started_at)
  VALUES (p_tenant_id, 'in_progress', now())
  ON CONFLICT (tenant_id) DO NOTHING;

  -- Create default onboarding tasks
  INSERT INTO tenant_onboarding_tasks (tenant_id, task_key, task_name, task_description, is_required, sort_order)
  VALUES
    (p_tenant_id, 'setup_branding', 'Setup Branding', 'Customize your hotel brand colors and logo', true, 1),
    (p_tenant_id, 'add_rooms', 'Add Rooms', 'Add your first room or room type', true, 2),
    (p_tenant_id, 'configure_payment', 'Configure Payment', 'Set up payment methods and financial settings', true, 3),
    (p_tenant_id, 'invite_staff', 'Invite Staff', 'Add team members and assign roles', false, 4),
    (p_tenant_id, 'test_booking', 'Test Booking', 'Create a test booking to verify everything works', false, 5)
  ON CONFLICT (tenant_id, task_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;