-- LEDGER-PHASE-2D-V1: POS Settlement Import Infrastructure
-- Tables for storing imported settlement data and mapping configurations

-- Table: pos_settlement_imports (stores raw imported settlement files)
CREATE TABLE IF NOT EXISTS pos_settlement_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  provider_name TEXT, -- e.g., "Interswitch", "Flutterwave", "Manual POS"
  settlement_date DATE NOT NULL,
  uploaded_by UUID REFERENCES staff(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  total_records INTEGER DEFAULT 0,
  matched_records INTEGER DEFAULT 0,
  unmatched_records INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: pos_settlement_records (individual transaction records from settlement files)
CREATE TABLE IF NOT EXISTS pos_settlement_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  import_id UUID NOT NULL REFERENCES pos_settlement_imports(id) ON DELETE CASCADE,
  transaction_date TIMESTAMP WITH TIME ZONE,
  amount NUMERIC(15,2) NOT NULL,
  stan TEXT, -- System Trace Audit Number
  rrn TEXT, -- Retrieval Reference Number
  terminal_id TEXT,
  approval_code TEXT,
  card_type TEXT,
  card_last4 TEXT,
  merchant_name TEXT,
  ledger_entry_id UUID REFERENCES ledger_entries(id) ON DELETE SET NULL, -- Link to matched ledger entry
  matched_at TIMESTAMP WITH TIME ZONE,
  match_confidence TEXT CHECK (match_confidence IN ('exact', 'probable', 'manual', NULL)),
  raw_data JSONB DEFAULT '{}', -- Store full original record
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: pos_column_mappings (tenant-specific column mapping configurations)
CREATE TABLE IF NOT EXISTS pos_column_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL,
  mapping_config JSONB NOT NULL, -- { "amount": "Transaction Amount", "date": "Date", "stan": "STAN", ... }
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, provider_name)
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_pos_settlement_imports_tenant ON pos_settlement_imports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_settlement_imports_date ON pos_settlement_imports(settlement_date);
CREATE INDEX IF NOT EXISTS idx_pos_settlement_records_tenant ON pos_settlement_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_settlement_records_import ON pos_settlement_records(import_id);
CREATE INDEX IF NOT EXISTS idx_pos_settlement_records_ledger ON pos_settlement_records(ledger_entry_id);
CREATE INDEX IF NOT EXISTS idx_pos_settlement_records_stan ON pos_settlement_records(stan) WHERE stan IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pos_settlement_records_rrn ON pos_settlement_records(rrn) WHERE rrn IS NOT NULL;

-- RLS Policies: Tenant isolation
ALTER TABLE pos_settlement_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_settlement_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_column_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for pos_settlement_imports" ON pos_settlement_imports
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation for pos_settlement_records" ON pos_settlement_records
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation for pos_column_mappings" ON pos_column_mappings
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid()));

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pos_mappings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pos_column_mappings_updated_at
  BEFORE UPDATE ON pos_column_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_pos_mappings_timestamp();