-- Create receipt sequences table for managing receipt numbering
CREATE TABLE IF NOT EXISTS public.receipt_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  receipt_type TEXT NOT NULL, -- 'payment', 'checkout', 'reservation', 'refund', 'adjustment'
  year INTEGER NOT NULL,
  next_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, receipt_type, year)
);

-- Enable RLS
ALTER TABLE public.receipt_sequences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant receipt sequences"
  ON public.receipt_sequences
  FOR SELECT
  USING (tenant_id = get_user_tenant(auth.uid()));

CREATE POLICY "System can manage receipt sequences"
  ON public.receipt_sequences
  FOR ALL
  USING (tenant_id = get_user_tenant(auth.uid()));

-- Function to generate receipt number
CREATE OR REPLACE FUNCTION public.generate_receipt_number(
  p_tenant_id UUID,
  p_receipt_type TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INTEGER;
  v_number INTEGER;
  v_receipt_number TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Insert or update sequence
  INSERT INTO receipt_sequences (tenant_id, receipt_type, year, next_number)
  VALUES (p_tenant_id, p_receipt_type, v_year, 2)
  ON CONFLICT (tenant_id, receipt_type, year)
  DO UPDATE SET 
    next_number = receipt_sequences.next_number + 1,
    updated_at = now()
  RETURNING next_number - 1 INTO v_number;
  
  -- Format: RCP-2025-000001
  v_receipt_number := 'RCP-' || v_year || '-' || LPAD(v_number::TEXT, 6, '0');
  
  RETURN v_receipt_number;
END;
$$;