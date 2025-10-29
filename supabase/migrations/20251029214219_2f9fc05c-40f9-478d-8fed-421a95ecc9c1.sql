-- Create organization_service_rules table
CREATE TABLE IF NOT EXISTS public.organization_service_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  allowed_services JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.organization_service_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_service_rules_select"
  ON public.organization_service_rules
  FOR SELECT
  USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "org_service_rules_manage"
  ON public.organization_service_rules
  FOR ALL
  USING (
    tenant_id = get_user_tenant(auth.uid()) 
    AND (
      has_role(auth.uid(), tenant_id, 'owner'::app_role) 
      OR has_role(auth.uid(), tenant_id, 'manager'::app_role)
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_org_service_rules_updated_at
  BEFORE UPDATE ON public.organization_service_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_org_service_rules_org_id ON public.organization_service_rules(organization_id);
CREATE INDEX idx_org_service_rules_tenant_id ON public.organization_service_rules(tenant_id);