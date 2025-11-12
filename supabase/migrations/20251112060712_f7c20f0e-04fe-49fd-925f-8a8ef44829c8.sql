-- Create quick_reply_templates table for managing auto-reply templates
CREATE TABLE IF NOT EXISTS quick_reply_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  service_category text NOT NULL,
  template_text text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  CONSTRAINT quick_reply_templates_tenant_category_order_key 
    UNIQUE(tenant_id, service_category, display_order)
);

-- Create index for faster queries
CREATE INDEX idx_quick_reply_templates_tenant_category 
  ON quick_reply_templates(tenant_id, service_category) 
  WHERE is_active = true;

-- Add RLS policies
ALTER TABLE quick_reply_templates ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users from same tenant to read
CREATE POLICY "Users can view templates for their tenant"
  ON quick_reply_templates FOR SELECT
  TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid()));

-- Allow managers/owners to insert templates
CREATE POLICY "Managers can insert templates"
  ON quick_reply_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = get_user_tenant(auth.uid()) AND 
    (has_role(auth.uid(), tenant_id, 'owner') OR has_role(auth.uid(), tenant_id, 'manager'))
  );

-- Allow managers/owners to update templates
CREATE POLICY "Managers can update templates"
  ON quick_reply_templates FOR UPDATE
  TO authenticated
  USING (
    tenant_id = get_user_tenant(auth.uid()) AND 
    (has_role(auth.uid(), tenant_id, 'owner') OR has_role(auth.uid(), tenant_id, 'manager'))
  )
  WITH CHECK (
    tenant_id = get_user_tenant(auth.uid()) AND 
    (has_role(auth.uid(), tenant_id, 'owner') OR has_role(auth.uid(), tenant_id, 'manager'))
  );

-- Allow managers/owners to delete templates
CREATE POLICY "Managers can delete templates"
  ON quick_reply_templates FOR DELETE
  TO authenticated
  USING (
    tenant_id = get_user_tenant(auth.uid()) AND 
    (has_role(auth.uid(), tenant_id, 'owner') OR has_role(auth.uid(), tenant_id, 'manager'))
  );