/**
 * Normalize folio ID to UUID string
 * Prevents "invalid input syntax for type uuid" errors
 * Version: UNIFIED-ADD-CHARGE-V1
 */
export function normalizeFolioId(value: any): string {
  if (!value) {
    throw new Error("Missing folio_id");
  }
  
  // If it's already a string UUID, return it
  if (typeof value === 'string') {
    return value;
  }
  
  // If it's an object with an id property, extract it
  if (typeof value === 'object' && value.id) {
    return value.id;
  }
  
  throw new Error(`Invalid folio_id format: received ${typeof value}`);
}
