/**
 * Normalize folio ID to UUID string
 * Prevents "invalid input syntax for type uuid" errors
 * Version: UNIFIED-ADD-CHARGE-V2-DEFENSIVE
 */
export function normalizeFolioId(value: any): string {
  console.log('[normalizeFolioId] INPUT', {
    raw: value,
    type: typeof value,
    hasId: value && typeof value === 'object' && 'id' in value,
  });

  if (!value) {
    console.error('[normalizeFolioId] ❌ MISSING_VALUE');
    throw new Error("Missing folio_id");
  }
  
  // If it's already a string UUID, return it
  if (typeof value === 'string') {
    const trimmed = value.trim();
    console.log('[normalizeFolioId] ✅ USING_STRING', trimmed);
    return trimmed;
  }
  
  // If it's an object with an id property, extract it
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = String((value as any).id || '').trim();
    console.log('[normalizeFolioId] ✅ USING_OBJECT_ID', id);
    return id;
  }
  
  console.error('[normalizeFolioId] ❌ INVALID_FOLIO_REF', value);
  throw new Error(`Invalid folio_id format: expected UUID string or object with id`);
}
