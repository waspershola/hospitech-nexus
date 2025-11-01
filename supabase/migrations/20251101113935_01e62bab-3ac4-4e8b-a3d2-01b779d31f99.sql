-- Receipt settings table
CREATE TABLE receipt_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id uuid REFERENCES finance_locations(id) ON DELETE SET NULL,
  
  -- Paper configuration
  paper_size text NOT NULL DEFAULT '80mm' CHECK (paper_size IN ('A4', 'A5', '58mm', '80mm')),
  printer_name text,
  printer_endpoint text,
  
  -- Content
  header_text text DEFAULT 'Thank you for your business',
  footer_text text DEFAULT 'Please visit us again',
  logo_url text,
  
  -- Display options
  show_vat_breakdown boolean DEFAULT true,
  include_service_charge boolean DEFAULT true,
  show_provider_fee boolean DEFAULT true,
  show_qr_code boolean DEFAULT false,
  
  -- Layout
  alignment text DEFAULT 'center' CHECK (alignment IN ('left', 'center', 'right')),
  font_size text DEFAULT 'normal' CHECK (font_size IN ('small', 'normal', 'large')),
  
  -- Auto-print settings
  auto_print_on_checkout boolean DEFAULT false,
  auto_print_on_payment boolean DEFAULT false,
  
  -- Metadata
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  UNIQUE(tenant_id, location_id)
);

-- Enable RLS
ALTER TABLE receipt_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "receipt_settings_tenant_access" ON receipt_settings
  FOR ALL USING (tenant_id = get_user_tenant(auth.uid()));

-- Audit log for receipt printing
CREATE TABLE receipt_print_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  receipt_settings_id uuid REFERENCES receipt_settings(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  printed_by uuid REFERENCES auth.users(id),
  printed_at timestamp with time zone DEFAULT now(),
  receipt_type text NOT NULL CHECK (receipt_type IN ('payment', 'invoice', 'checkout', 'refund')),
  receipt_data jsonb DEFAULT '{}'::jsonb,
  print_method text CHECK (print_method IN ('thermal', 'pdf', 'email'))
);

-- Enable RLS
ALTER TABLE receipt_print_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "receipt_logs_tenant_access" ON receipt_print_logs
  FOR SELECT USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "receipt_logs_insert" ON receipt_print_logs
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant(auth.uid()));

-- Add helpful comments
COMMENT ON TABLE receipt_settings IS 'Configuration for receipt printing per location/tenant';
COMMENT ON TABLE receipt_print_logs IS 'Audit trail for all printed receipts';