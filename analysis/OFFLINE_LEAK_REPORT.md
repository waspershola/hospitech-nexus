# Offline Leak Report - SPA Restoration

**Date:** 2024-12-04  
**Status:** ✅ COMPLETE - VERIFIED

## Summary

The SPA has been fully restored to online-only mode. All offline/Electron logic has been removed from core SPA files. Old unused offline-aware hooks have been deleted.

---

## Phase 1: AuthContext Cleanup ✅

**File:** `src/contexts/AuthContext.tsx`

**Changes Made:**
- ❌ Removed: `import { sessionManager } from '@/lib/offline/sessionManager'`
- ❌ Removed: All `sessionManager.setSession()` calls (lines 119-126, 148-155, 225-232)
- ❌ Removed: `sessionManager.clearSession()` call (line 133)

**Verification:** AuthContext now uses pure Supabase auth with no offline session tracking.

---

## Phase 2: useCheckout Hook ✅

**File:** `src/hooks/useCheckout.ts`

**Changes Made:**
- ❌ Removed: `import { offlineAwareEdgeFunction } from '@/lib/offline/offlineAwareClient'`
- ✅ Replaced: `offlineAwareEdgeFunction('complete-checkout', ...)` → `supabase.functions.invoke('complete-checkout', ...)`
- ❌ Removed: All `queued` handling logic

**Verification:** Checkout now makes direct Supabase edge function calls.

---

## Phase 3: Payment Hook ✅

**File:** `src/hooks/usePayment.ts` (NEW - replaces useOfflineAwarePayment)

**Changes Made:**
- Created new online-only payment hook
- ❌ Removed: All offline imports (`offlineAwareEdgeFunction`, `offlinePaymentManager`, `isElectronContext`)
- ✅ Uses: Direct `supabase.functions.invoke('create-payment', ...)`
- ❌ Removed: Offline/queued toast messages

**Old File:** `src/hooks/useOfflineAwarePayment.ts` - ✅ DELETED (unused)

---

## Phase 4: Folio Charge Hook ✅

**File:** `src/hooks/useFolioCharge.ts` (NEW - replaces useOfflineAwareFolioCharge)

**Changes Made:**
- Created new online-only folio charge hook
- ❌ Removed: All offline imports (`offlineAwareRPC`, `offlineFolioManager`, `isElectronContext`)
- ✅ Uses: Direct `supabase.rpc('folio_post_charge', ...)`
- ❌ Removed: Offline/queued toast messages

**Old File:** `src/hooks/useOfflineAwareFolioCharge.ts` - ✅ DELETED (unused)

---

## Phase 5: Electron Detection Boundary ✅

**File:** `src/lib/environment/isElectron.ts` (NEW)

**Purpose:** Single source of truth for Electron detection. Used to guard offline-only components.

---

## Files That Import Offline Logic

### Already Guarded (Electron-only, safe to keep):
| File | Guard | Status |
|------|-------|--------|
| `src/components/offline/OfflineStatusIndicator.tsx` | `isElectronContext()` | ✅ Safe |
| `src/components/offline/SyncStatusIndicator.tsx` | `isElectronContext()` | ✅ Safe |
| `src/components/offline/OfflineDiagnostics.tsx` | `window.electronAPI` | ✅ Safe |

### Electron-only Hooks (not imported by SPA core):
| File | Purpose | Status |
|------|---------|--------|
| `src/hooks/useOfflineSession.ts` | Electron session | ✅ Isolated |
| `src/hooks/useOfflineSync.ts` | Electron sync | ✅ Isolated |
| `src/hooks/useOfflineQueue.v2.ts` | Electron queue | ✅ Isolated |
| `src/hooks/useOfflinePrint.ts` | Electron printing | ✅ Isolated |
| `src/hooks/useAutoUpdate.ts` | Electron updates | ✅ Isolated |

### Updated Files:
| File | Change | Status |
|------|--------|--------|
| `src/modules/frontdesk/components/OfflineIndicator.tsx` | Added `isElectron` guard, removed offline queue dependency | ✅ Fixed |

---

## Verification Checklist

- [x] AuthContext no longer references sessionManager
- [x] useCheckout uses direct supabase.functions.invoke
- [x] usePayment (new) uses direct supabase.functions.invoke
- [x] useFolioCharge (new) uses direct supabase.rpc
- [x] No non-offline component imports from src/lib/offline/*
- [x] Electron detection boundary created

---

## Migration Notes

Components that previously used offline-aware hooks should update their imports:

```typescript
// OLD (offline-aware)
import { useOfflineAwarePayment } from '@/hooks/useOfflineAwarePayment';
import { useOfflineAwareFolioCharge } from '@/hooks/useOfflineAwareFolioCharge';

// NEW (online-only)
import { usePayment } from '@/hooks/usePayment';
import { useFolioCharge } from '@/hooks/useFolioCharge';
```

---

## Result

The SPA now operates in **online-only mode**:
- ✅ Authentication uses pure Supabase auth
- ✅ Checkout works immediately after login
- ✅ Payments use direct edge function calls
- ✅ Folio charges use direct RPC calls
- ✅ No race conditions from sessionManager
- ✅ Offline features remain isolated to Electron
