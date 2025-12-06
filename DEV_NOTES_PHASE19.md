# Phase 19: Local SPA Shell Bundled in Electron

## Overview

Phase 19 implements **local SPA loading** inside Electron, enabling the app to boot 100% offline without requiring network access to load the React frontend.

## Architecture

### Load Modes

| Mode | When Used | Behavior |
|------|-----------|----------|
| `local` | Production builds | Loads SPA from bundled `dist/index.html` |
| `remote` | Development | Loads SPA from Vite dev server or remote URL |

### Configuration

The load mode is controlled via `electron/config/loadConfig.ts`:

```typescript
import { getSpaLoadMode, getRemoteSpaUrl } from './config/loadConfig';

const mode = getSpaLoadMode();
if (mode === 'local') {
  win.loadFile(path.join(__dirname, '../dist/index.html'));
} else {
  win.loadURL(getRemoteSpaUrl());
}
```

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `SPA_LOAD_MODE` | Force `local` or `remote` mode | Auto-detected |
| `SPA_REMOTE_URL` | Custom remote URL for dev/debug | `http://localhost:8080` |
| `VITE_DEV_SERVER_URL` | Vite dev server URL | `http://localhost:8080` |
| `NODE_ENV` | Used to auto-detect mode | `development` or `production` |

### Priority

1. `SPA_LOAD_MODE` environment variable (explicit override)
2. `NODE_ENV`-based default:
   - `production` → `local`
   - `development` → `remote`

## Commands

### Development

```bash
# Start Vite dev server + Electron (loads remote SPA)
npm run dev:electron
```

### Production Build

```bash
# Build SPA + Electron main process
npm run build:electron

# Package for distribution
npm run dist        # All platforms
npm run dist:win    # Windows only
```

## Testing Checklist

### Offline Cold Boot Test

1. Build and package the Electron app:
   ```bash
   npm run build:electron
   npm run dist:win
   ```

2. **Disconnect the internet completely**

3. Start the packaged app from `release/` folder

4. Verify:
   - [ ] SPA loads (Front Desk visible, no "You're Offline" error page)
   - [ ] Orange "Offline Mode" banner appears at top
   - [ ] Room Grid shows cached rooms from IndexedDB
   - [ ] Bookings page shows cached data or empty state
   - [ ] Guests page shows cached data or empty state

### Offline Refresh Test (Ctrl+R)

1. While still offline, press **Ctrl+R** or **F5**

2. Verify:
   - [ ] SPA reloads from local files (not external fallback)
   - [ ] No `ERR_INTERNET_DISCONNECTED` errors
   - [ ] IndexedDB data remains intact
   - [ ] Same offline pages appear with cached data

### Room Drawer Offline Test

1. Click on any room tile while offline

2. Verify:
   - [ ] Room drawer opens with cached booking/guest data
   - [ ] "Offline snapshot" banner visible in drawer
   - [ ] All action buttons disabled with offline indicator
   - [ ] Clicking actions shows "Unavailable offline" toast

### Online Recovery Test

1. Reconnect to the internet

2. Verify:
   - [ ] Orange offline banner disappears
   - [ ] Sync engine resumes (check for sync activity)
   - [ ] Live data replaces cached data
   - [ ] All actions become available again

### Browser Regression Test

1. Open web app in Chrome (not Electron)

2. Verify:
   - [ ] No Electron-specific console errors
   - [ ] `isElectronContext()` returns `false`
   - [ ] All features work normally
   - [ ] No offline bridge code executes

## File Structure

```
electron/
├── config/
│   └── loadConfig.ts    # SPA load mode configuration
├── main.ts              # Main process (uses loadConfig)
├── preload.ts           # Preload script (unchanged)
└── types.ts             # Type definitions

dist/                    # Vite SPA build output
├── index.html           # Entry point for local loading
├── assets/              # Bundled JS/CSS
└── ...

release/                 # Electron packaged output
├── LuxuryHotelPro-Setup-X.X.X.exe
└── LuxuryHotelPro-Portable-X.X.X.exe
```

## Troubleshooting

### SPA not loading in production

1. Check that `dist/index.html` exists after build
2. Verify `electron-builder.yml` includes `dist/**/*` in files
3. Check main.log in `%APPDATA%/LuxuryHotelPro Offline/logs/`

### Wrong mode detected

Set explicit mode:
```bash
# Force local mode
SPA_LOAD_MODE=local npm run dist

# Force remote mode for debugging
SPA_LOAD_MODE=remote npm run dev:electron
```

### IndexedDB not accessible

1. Ensure app has been run online at least once to seed data
2. Check DevTools > Application > IndexedDB for database presence
3. Verify `TenantDBManager` initialization in console logs

## Version Marker

`PHASE-19-LOCAL-SPA-BOOT`
