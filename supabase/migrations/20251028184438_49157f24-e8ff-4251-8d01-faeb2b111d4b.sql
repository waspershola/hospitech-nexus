-- Create hotel_domains table for custom domain management
CREATE TABLE hotel_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  domain text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verifying', 'verified', 'error', 'removed')),
  verification_token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  vercel_project_id text,
  vercel_domain_config jsonb,
  dns_instructions jsonb,
  certificate_status text DEFAULT 'pending',
  error_message text,
  created_at timestamptz DEFAULT now(),
  verified_at timestamptz,
  last_check timestamptz
);

-- Create partial unique index for one verified domain per tenant
CREATE UNIQUE INDEX idx_one_verified_domain_per_tenant 
ON hotel_domains(tenant_id) 
WHERE status = 'verified';

-- Enable RLS
ALTER TABLE hotel_domains ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant domains"
ON hotel_domains FOR SELECT
USING (tenant_id IN (
  SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
));

CREATE POLICY "Owners and managers can manage domains"
ON hotel_domains FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'manager')
  )
);

-- Indexes for performance
CREATE INDEX idx_hotel_domains_tenant ON hotel_domains(tenant_id);
CREATE INDEX idx_hotel_domains_status ON hotel_domains(status);
CREATE INDEX idx_hotel_domains_domain ON hotel_domains(domain);

-- Function to resolve tenant by custom domain
CREATE OR REPLACE FUNCTION get_tenant_by_domain(_domain text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id 
  FROM hotel_domains 
  WHERE domain = _domain 
    AND status = 'verified'
  LIMIT 1;
$$;