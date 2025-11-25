-- PHASE 1: DATABASE FOUNDATION FOR GEMINI AI MODULE
-- Add AI columns to guest_communications table
ALTER TABLE guest_communications 
ADD COLUMN IF NOT EXISTS original_text TEXT,
ADD COLUMN IF NOT EXISTS cleaned_text TEXT,
ADD COLUMN IF NOT EXISTS translated_text TEXT,
ADD COLUMN IF NOT EXISTS detected_language VARCHAR(10),
ADD COLUMN IF NOT EXISTS target_language VARCHAR(10),
ADD COLUMN IF NOT EXISTS intent VARCHAR(50),
ADD COLUMN IF NOT EXISTS ai_auto_response BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS confidence NUMERIC(3,2);

-- Create hotel_faqs table for tenant-specific FAQs
CREATE TABLE IF NOT EXISTS hotel_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  category VARCHAR(50) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords JSONB DEFAULT '[]'::jsonb,
  language VARCHAR(10) DEFAULT 'en',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for tenant isolation
CREATE INDEX IF NOT EXISTS idx_hotel_faqs_tenant_id ON hotel_faqs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hotel_faqs_category ON hotel_faqs(tenant_id, category) WHERE active = true;

-- Enable RLS on hotel_faqs
ALTER TABLE hotel_faqs ENABLE ROW LEVEL SECURITY;

-- RLS policies for hotel_faqs
CREATE POLICY "Users can view FAQs for their tenant"
  ON hotel_faqs FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage FAQs for their tenant"
  ON hotel_faqs FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'manager')
    )
  );

-- Create sop_knowledge_base table for operational procedures
CREATE TABLE IF NOT EXISTS sop_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  department VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords JSONB DEFAULT '[]'::jsonb,
  applicable_roles JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for SOP lookup
CREATE INDEX IF NOT EXISTS idx_sop_tenant_id ON sop_knowledge_base(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sop_department ON sop_knowledge_base(tenant_id, department) WHERE active = true;

-- Enable RLS on sop_knowledge_base
ALTER TABLE sop_knowledge_base ENABLE ROW LEVEL SECURITY;

-- RLS policies for sop_knowledge_base
CREATE POLICY "Staff can view SOPs for their tenant"
  ON sop_knowledge_base FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage SOPs for their tenant"
  ON sop_knowledge_base FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'manager')
    )
  );

-- Add comment for documentation
COMMENT ON TABLE hotel_faqs IS 'Stores tenant-specific FAQs for AI auto-responses in guest chat';
COMMENT ON TABLE sop_knowledge_base IS 'Stores operational procedures for AI-powered staff training assistant';