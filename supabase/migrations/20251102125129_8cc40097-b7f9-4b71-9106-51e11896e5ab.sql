-- Create hotel_dashboard_defaults table for auto-selecting payment locations per dashboard
CREATE TABLE IF NOT EXISTS public.hotel_dashboard_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  dashboard_name TEXT NOT NULL,
  default_location_id UUID REFERENCES public.finance_locations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, dashboard_name)
);

-- Enable RLS
ALTER TABLE public.hotel_dashboard_defaults ENABLE ROW LEVEL SECURITY;

-- Users can view their tenant's dashboard defaults
CREATE POLICY "Users can view their tenant dashboard defaults"
  ON public.hotel_dashboard_defaults FOR SELECT
  USING (tenant_id = get_user_tenant(auth.uid()));

-- Managers can manage dashboard defaults
CREATE POLICY "Managers can manage dashboard defaults"
  ON public.hotel_dashboard_defaults FOR ALL
  USING (
    tenant_id = get_user_tenant(auth.uid()) AND 
    (has_role(auth.uid(), tenant_id, 'owner') OR has_role(auth.uid(), tenant_id, 'manager'))
  );

-- Add trigger for updated_at
CREATE TRIGGER update_hotel_dashboard_defaults_updated_at
  BEFORE UPDATE ON public.hotel_dashboard_defaults
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();