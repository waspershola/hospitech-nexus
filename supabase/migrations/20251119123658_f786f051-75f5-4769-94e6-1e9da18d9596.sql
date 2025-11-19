-- Migration: Add Multi-Folio Support Columns to stay_folios
-- Version: MULTI-FOLIO-V1

-- Add new columns to stay_folios table
ALTER TABLE stay_folios
ADD COLUMN IF NOT EXISTS folio_type TEXT NOT NULL DEFAULT 'room',
ADD COLUMN IF NOT EXISTS parent_folio_id UUID REFERENCES stay_folios(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS folio_number TEXT;

-- Add check constraint for folio_type (ENUM semantics)
ALTER TABLE stay_folios
ADD CONSTRAINT stay_folios_folio_type_check
CHECK (folio_type IN ('room', 'incidentals', 'corporate', 'group', 'mini_bar', 'spa', 'restaurant'));

-- Add indexes for efficient multi-folio queries
CREATE INDEX idx_stay_folios_tenant_booking_type 
ON stay_folios(tenant_id, booking_id, folio_type);

CREATE INDEX idx_stay_folios_parent_folio 
ON stay_folios(parent_folio_id) 
WHERE parent_folio_id IS NOT NULL;

CREATE INDEX idx_stay_folios_folio_number 
ON stay_folios(tenant_id, folio_number) 
WHERE folio_number IS NOT NULL;

-- Function to generate folio number
CREATE OR REPLACE FUNCTION generate_folio_number(p_tenant_id UUID, p_booking_id UUID, p_folio_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_ref TEXT;
  v_folio_count INTEGER;
  v_type_prefix TEXT;
BEGIN
  SELECT booking_reference INTO v_booking_ref
  FROM bookings
  WHERE id = p_booking_id AND tenant_id = p_tenant_id;
  
  SELECT COUNT(*) INTO v_folio_count
  FROM stay_folios
  WHERE booking_id = p_booking_id AND tenant_id = p_tenant_id;
  
  v_type_prefix := CASE p_folio_type
    WHEN 'room' THEN 'R'
    WHEN 'incidentals' THEN 'I'
    WHEN 'corporate' THEN 'C'
    WHEN 'group' THEN 'G'
    WHEN 'mini_bar' THEN 'MB'
    WHEN 'spa' THEN 'S'
    WHEN 'restaurant' THEN 'RS'
    ELSE 'O'
  END;
  
  RETURN v_booking_ref || '-' || v_type_prefix || '-' || (v_folio_count + 1)::TEXT;
END;
$$;

-- Update existing folios
UPDATE stay_folios
SET folio_number = generate_folio_number(tenant_id, booking_id, folio_type)
WHERE folio_number IS NULL;

-- Mark first folio per booking as primary
WITH first_folios AS (
  SELECT DISTINCT ON (booking_id, tenant_id)
    id
  FROM stay_folios
  ORDER BY booking_id, tenant_id, created_at ASC
)
UPDATE stay_folios sf
SET is_primary = TRUE
FROM first_folios ff
WHERE sf.id = ff.id AND sf.is_primary = FALSE;

-- Prevent multiple primary folios per booking
CREATE UNIQUE INDEX idx_stay_folios_booking_primary
ON stay_folios(tenant_id, booking_id)
WHERE is_primary = TRUE;