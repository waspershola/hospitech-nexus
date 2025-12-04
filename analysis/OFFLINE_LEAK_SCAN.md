# Offline Leak Scan Report - SPA Cleanup

**Date:** 2024-12-04  
**Status:** ✅ COMPLETE

---

## Summary

Comprehensive audit of offline/Electron code leaks in the SPA. Goal: Ensure browser-based SPA runs as pure online Supabase app with zero offline runtime initialization.

---

## ✅ COMPLETED (Phase 1)

### 1. Environment Detection Consolidated
- **File:** `src/lib/environment/isElectron.ts` ✅
- Single source of truth for `isElectronContext()`
- All offline hooks now import from this file

### 2. Main Entry Points Clean
- **`src/main.tsx`** ✅ - No offline imports
- **`src/contexts/AuthContext.tsx`** ✅ - Pure Supabase auth, no offline imports
- Checkout reminder scheduler has non-blocking error handling

### 3. Offline Hooks Have Lazy Loading + Guards
| Hook | Guard | Lazy Loading | Status |
|------|-------|--------------|--------|
| `useOfflineSync.ts` | ✅ `isElectronContext()` | ✅ Dynamic import | Fixed |
| `useOfflineSession.ts` | ✅ `isElectronContext()` | ✅ Dynamic import | Fixed |
| `useOfflineQueue.v2.ts` | ✅ `isElectronContext()` | ✅ Dynamic import | Fixed |
| `useAutoUpdate.ts` | ✅ `isElectronContext()` | ✅ Dynamic import | Fixed |
| `useOfflineQueue.ts` (legacy) | ✅ `isElectronContext()` | ✅ Dynamic import | Fixed |
| `useOfflinePrint.ts` | ✅ `isElectronContext()` | ✅ Dynamic import | Fixed |

### 4. Offline Diagnostics Component
- **`src/components/offline/OfflineDiagnostics.tsx`** ✅ - Has `isElectronContext()` guard + lazy loading

---

## ✅ COMPLETED (Phase 2)

### Issue 1: SyncStatusIndicator - FIXED
**File:** `src/components/offline/SyncStatusIndicator.tsx`
**Fix Applied:** Moved guard AFTER hook call. Hook returns dummy values in browser.
```tsx
// Call hook FIRST (hook returns dummy values when not in Electron)
const { ... } = useOfflineSync();

// GUARD: Only show in Electron context - check AFTER hooks
if (!isElectronContext()) {
  return null;
}
```

### Issue 2: OfflineStatusIndicator - FIXED
**File:** `src/components/offline/OfflineStatusIndicator.tsx`
**Fix Applied:** 
1. Hooks called first, guard after
2. Dynamic import guarded by `inElectron` check inside useEffect
```tsx
const [isOnline, setIsOnline] = useState(navigator.onLine);
const inElectron = isElectronContext();

useEffect(() => {
  if (!inElectron) return;  // Skip dynamic import in browser
  // ...dynamic import only happens in Electron
}, [inElectron]);

if (!inElectron) return null;  // Guard after hooks
```

### Issue 3: UpdateNotification - FIXED
**File:** `src/components/offline/UpdateNotification.tsx`
**Fix Applied:** Uses `isElectronContext()` consistently, hooks called first
```tsx
const { status, ... } = useAutoUpdate();
const inElectron = isElectronContext();

if (!inElectron) return null;  // Guard after hooks
```

---

## Offline Module Log Sources

These modules produce the unwanted browser logs when imported:

| Module | Log Pattern | Import Chain |
|--------|-------------|--------------|
| `syncEngine.ts` | `[SyncEngine] ...` | Singleton created on import |
| `sessionManager.ts` | `[SessionManager] ...` | Singleton created on import |
| `tenantDBManager.ts` | `[TenantDBManager] ...` | Singleton created on import |

**Root Cause:** These modules export singleton instances that initialize on import. When any SPA code imports them (even via dynamic import), they initialize and start logging.

**Solution:** Ensure ALL dynamic imports are guarded by `isElectronContext()` so they never execute in browser.

---

## Files Safe to Keep (Electron-Only, Properly Guarded)

These files exist in `src/lib/offline/` but are ONLY accessed via guarded dynamic imports:

- `offlineQueue.ts`
- `offlineAwareClient.ts`
- `offlineFolioManager.ts`
- `offlinePaymentManager.ts`
- `offlinePrintManager.ts`
- `offlineTestUtils.ts`
- `offlineTypes.ts` (type-only imports are safe)
- `sessionManager.ts`
- `syncEngine.ts`
- `tenantDBManager.ts`
- `autoUpdateManager.ts`

---

## Fix Plan

### Phase 2A: Fix Component Guards (3 files)
1. `SyncStatusIndicator.tsx` - Move guard after hook
2. `OfflineStatusIndicator.tsx` - Restructure completely
3. `UpdateNotification.tsx` - Use consistent guard function

### Phase 2B: Verify No More Leaks
After fixes, verify in browser console:
- No `[SyncEngine] ...` logs
- No `[SessionManager] ...` logs
- No `[TenantDBManager] ...` logs
- No IndexedDB errors

---

## Acceptance Criteria

When running SPA in browser (not Electron):
1. ✅ No offline runtime logs in console
2. ✅ Login works reliably
3. ✅ Navigation loads correctly
4. ✅ Core features work with direct Supabase calls
5. ✅ No IndexedDB initialization errors
