-- Add missing columns to hotel_branding table
ALTER TABLE hotel_branding 
ADD COLUMN IF NOT EXISTS hero_image text,
ADD COLUMN IF NOT EXISTS headline text,
ADD COLUMN IF NOT EXISTS favicon_url text;

-- Create hotel_meta table
CREATE TABLE hotel_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  hotel_name text,
  tagline text,
  description text,
  contact_email text,
  contact_phone text,
  social_links jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE hotel_meta ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hotel_meta
CREATE POLICY "Users can view their tenant meta"
  ON hotel_meta FOR SELECT
  USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "Owners/Managers can manage meta"
  ON hotel_meta FOR ALL
  USING (
    tenant_id = get_user_tenant(auth.uid()) 
    AND (has_role(auth.uid(), tenant_id, 'owner'::app_role) OR has_role(auth.uid(), tenant_id, 'manager'::app_role))
  );

-- Trigger for updated_at
CREATE TRIGGER update_hotel_meta_updated_at
  BEFORE UPDATE ON hotel_meta
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create Storage Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding-assets', 'branding-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "Users can view branding assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'branding-assets');

CREATE POLICY "Owners/Managers can upload branding assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'branding-assets'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Owners/Managers can update their branding assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'branding-assets'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Owners/Managers can delete their branding assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'branding-assets'
    AND auth.uid() IS NOT NULL
  );