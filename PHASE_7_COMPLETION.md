# Phase 7: Auto-Launch & Auto-Updates - COMPLETE ✅

## Overview
Phase 7 implements auto-launch on Windows startup and automatic update mechanism via GitHub releases, enabling seamless app updates and convenient startup behavior.

## What Was Implemented

### 1. Auto-Launch Manager (`auto-launch` package)
**Windows startup integration:**
- **Registry Integration**: Uses `auto-launch` npm package for Windows registry manipulation
- **Enable/Disable**: Staff can toggle auto-launch in settings
- **Path Detection**: Automatically detects app executable path
- **Status Check**: Query current auto-launch status

**Configuration:**
```typescript
const autoLauncher = new AutoLaunch({
  name: 'LuxuryHotelPro',
  path: app.getPath('exe'),
});
```

### 2. Auto-Update Manager (`src/lib/offline/autoUpdateManager.ts`)
**Update orchestration:**
- **Check for Updates**: Query GitHub releases for new versions
- **Download Progress**: Track download percentage (0-100%)
- **Update Downloaded**: Notify when ready to install
- **Install & Restart**: Trigger app restart with new version
- **Status Management**: Maintain update state across app lifecycle

**Status Interface:**
```typescript
interface UpdateStatus {
  available: boolean;
  downloading: boolean;
  downloaded: boolean;
  progress: number;
  info: UpdateInfo | null;
  error: string | null;
}
```

### 3. React Hook (`src/hooks/useAutoUpdate.ts`)
**User-facing API:**
- `checkForUpdates()`: Manually check for new versions
- `downloadUpdate()`: Start downloading update
- `installUpdate()`: Install and restart app
- `status`: Current update status with reactive updates
- `isChecking`: Loading state for update check

### 4. Update Notification UI (`src/components/offline/UpdateNotification.tsx`)
**Visual update prompts:**
- **Update Available Dialog**: Shows new version, release date, and release notes
- **Download Progress**: Real-time progress bar during download
- **Install Prompt**: "Install & Restart" button when download completes
- **Dismiss Options**: "Remind Me Later" and "Install Later" buttons
- **Error Display**: Shows error messages if update fails

**Features:**
- Auto-opens dialog when update available
- Shows "What's New" section with release notes
- Progress bar with percentage during download
- Graceful error handling with retry option

### 5. Auto-Launch Settings UI (`src/components/offline/AutoLaunchSettings.tsx`)
**Settings card component:**
- **Toggle Switch**: Enable/disable auto-launch
- **Status Display**: Shows current auto-launch state
- **Loading States**: Indicates when setting is being changed
- **Success Toasts**: Confirms setting changes
- **Icon & Description**: Clear UI with Power icon

### 6. Electron Main Process Updates (`electron/main.ts`)
**IPC Handlers:**
- `update:check`: Check for updates and return version info
- `update:download`: Download update file
- `update:install`: Quit and install update
- `autolaunch:get`: Get auto-launch enabled status
- `autolaunch:set`: Enable/disable auto-launch

**Auto-Updater Configuration:**
- Manual download control (`autoDownload: false`)
- Install on app quit (`autoInstallOnAppQuit: true`)
- Check on startup (3 second delay)
- Periodic checks every 4 hours
- GitHub releases as update source

**Event Handling:**
- `update-available`: Notify renderer of new version
- `download-progress`: Send progress percentage
- `update-downloaded`: Notify download complete
- `error`: Log and handle update errors

### 7. Electron Preload Updates (`electron/preload.ts`)
**New IPC Methods:**
- `checkForUpdates()`: Returns `UpdateCheckResult`
- `downloadUpdate()`: Initiates download
- `installUpdate()`: Installs and restarts
- `onUpdateDownloadProgress(callback)`: Subscribe to progress
- `onUpdateDownloaded(callback)`: Subscribe to download complete

## Architecture

### Update Flow
```
App Startup
    ↓
Check for Updates (3s delay)
    ↓
Update Available? → NO → Wait 4 hours → Check Again
    ↓ YES
Notify Renderer
    ↓
Show Update Dialog
    ↓
User Clicks "Download Update"
    ↓
electron-updater downloads from GitHub
    ↓
Send Progress Events (0-100%)
    ↓
Download Complete
    ↓
Show "Install & Restart" Dialog
    ↓
User Clicks "Install & Restart"
    ↓
App Quits → Installer Runs → App Restarts with New Version
```

### Auto-Launch Flow
```
User Opens Settings
    ↓
Toggle "Launch on Startup"
    ↓
Call autoLauncher.enable() or disable()
    ↓
Update Windows Registry
    ↓
Show Success Toast
    ↓
Next Windows Startup → App Launches Automatically
```

## Integration Points

### Where to Add Update Notification

**App Root (`src/App.tsx` or equivalent):**
```tsx
import { UpdateNotification } from '@/components/offline/UpdateNotification';

function App() {
  return (
    <>
      {/* Existing app content */}
      <UpdateNotification />
    </>
  );
}
```

### Where to Add Auto-Launch Settings

**Settings Page (e.g., `src/pages/Settings.tsx`):**
```tsx
import { AutoLaunchSettings } from '@/components/offline/AutoLaunchSettings';

function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Other settings sections */}
      
      <div>
        <h3 className="text-lg font-medium mb-4">Desktop App</h3>
        <AutoLaunchSettings />
      </div>
    </div>
  );
}
```

## GitHub Release Configuration

### Release Format Expected by electron-updater

**Repository Setup:**
1. Create GitHub release with version tag (e.g., `v1.2.0`)
2. Upload build artifacts to release:
   - `LuxuryHotelPro-Setup-1.2.0.exe` (NSIS installer)
   - `LuxuryHotelPro-1.2.0-win.zip` (portable)
   - `latest.yml` (auto-generated by electron-builder)

**`latest.yml` Example:**
```yaml
version: 1.2.0
files:
  - url: LuxuryHotelPro-Setup-1.2.0.exe
    sha512: [hash]
    size: 87654321
path: LuxuryHotelPro-Setup-1.2.0.exe
sha512: [hash]
releaseDate: '2025-01-15T10:00:00.000Z'
```

### Release Notes in Dialog

Release notes come from GitHub release description. Use markdown format:

```markdown
## What's New in v1.2.0

### Features
- Added offline payment collection
- Improved sync reliability

### Bug Fixes
- Fixed folio balance calculation
- Resolved print dialog issues

### Performance
- 30% faster room grid loading
- Reduced memory usage
```

## Testing Checklist

### Auto-Launch Testing
- [ ] Enable auto-launch in settings → verify toast confirmation
- [ ] Restart Windows → verify app launches automatically
- [ ] Disable auto-launch → restart Windows → verify app does NOT launch
- [ ] Check Windows Task Manager → Startup tab → verify entry exists when enabled
- [ ] Verify auto-launch works after app update

### Auto-Update Testing (Production)
- [ ] Create test GitHub release with new version number
- [ ] Wait for app to check for updates (or trigger manually)
- [ ] Verify update notification dialog appears
- [ ] Click "Download Update" → verify progress bar shows 0-100%
- [ ] Verify "Install & Restart" button appears when download completes
- [ ] Click "Install & Restart" → verify app quits and installer runs
- [ ] Verify new version launches after installation
- [ ] Check app version in settings matches new version

### Auto-Update Testing (Development)
- [ ] Auto-updater disabled in development mode (expected behavior)
- [ ] Manual update check returns "No updates available"
- [ ] Update notification does NOT appear in development

### Error Handling
- [ ] Disconnect internet → check for updates → verify error message
- [ ] Download update with slow connection → verify progress updates
- [ ] Cancel download mid-way (close dialog) → verify can retry later
- [ ] Install update with app file locked → verify error handling

### UI/UX
- [ ] Update dialog shows version number, release date
- [ ] Release notes display correctly with markdown formatting
- [ ] Progress bar animates smoothly during download
- [ ] "Remind Me Later" dismisses dialog without downloading
- [ ] "Install Later" dismisses dialog after download complete
- [ ] Auto-launch toggle responds immediately with loading state
- [ ] Success toasts appear for all successful actions

## Benefits

### For Staff
✅ **Automatic updates** - No manual download/install required  
✅ **Transparent process** - Clear UI showing version, progress, release notes  
✅ **Controlled timing** - Choose when to install updates  
✅ **Convenient startup** - App ready on Windows boot (optional)  
✅ **Always current** - Background checks ensure latest features/fixes

### For System
✅ **Seamless deployment** - Push updates via GitHub releases  
✅ **Version control** - Track installed versions and rollback if needed  
✅ **Reduced support** - Auto-updates prevent "outdated app" issues  
✅ **Security patches** - Critical fixes deploy quickly  
✅ **Usage tracking** - Monitor update adoption rates

## Configuration

### Build Configuration (`package.json`)

Ensure electron-builder is configured for auto-updates:

```json
{
  "build": {
    "appId": "com.luxuryhotelpro.desktop",
    "productName": "LuxuryHotelPro",
    "publish": {
      "provider": "github",
      "owner": "your-github-username",
      "repo": "luxury-hotel-pro"
    },
    "win": {
      "target": ["nsis", "portable"],
      "icon": "build/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

### Environment Variables

Set `GH_TOKEN` in GitHub Actions for auto-updater to access releases:

```yaml
# .github/workflows/electron-build.yml
env:
  GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Known Limitations

1. **Development Mode**: Auto-updater disabled in development (by design)
2. **GitHub Only**: Currently configured for GitHub releases only (can support other providers)
3. **Windows Only**: Auto-launch tested for Windows (Linux/Mac require different approach)
4. **Manual First Install**: Initial installation requires manual download
5. **Full Download**: Delta updates not implemented (downloads full installer each time)

## Next Steps

### Phase 8: Testing & Documentation (FINAL)
- Comprehensive integration testing across all phases
- End-to-end workflow testing (offline → sync → print)
- Performance benchmarking (IndexedDB queries, sync speed)
- User documentation (installation guide, troubleshooting)
- Deployment guide (building, signing, releasing)
- Production readiness checklist

---

**Phase 7 Status**: ✅ COMPLETE & LOCKED  
**Deployment**: Desktop app build required with GitHub release setup  
**Testing Required**: Full auto-update workflow testing with real GitHub releases  
**Dependencies Added**: `auto-launch@latest` for Windows startup integration
