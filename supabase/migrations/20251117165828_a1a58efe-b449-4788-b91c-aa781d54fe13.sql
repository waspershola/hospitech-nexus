
-- Phase 2 Step A: Link orphaned payments to their folios
UPDATE payments p
SET stay_folio_id = sf.id
FROM stay_folios sf
WHERE p.booking_id = sf.booking_id
  AND p.stay_folio_id IS NULL
  AND p.booking_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN payments.stay_folio_id IS 'Links payment to the folio where it was posted. Backfilled for all historical payments.';
