# LuxuryHotelPro Offline Desktop

## 📖 Overview

The **LuxuryHotelPro Offline Desktop** app is a Windows Electron application that provides full offline operation capabilities for critical hotel operations including:

- Check-in / Check-out
- Payment collection
- Folio management
- QR billing
- Housekeeping
- Kitchen & bar operations

All data is synchronized with Supabase when internet connectivity is restored.

---

## 🏗️ Architecture

### Phase 1: Foundation & Security (COMPLETE)

**Implemented:**
- ✅ Secure Electron shell with `contextIsolation` and `sandbox`
- ✅ Typed IPC bridge (`window.electronAPI`)
- ✅ Network status monitoring
- ✅ Logging system (logs in `%APPDATA%/LuxuryHotelPro Offline/logs/`)
- ✅ Auto-updater foundation (GitHub releases)
- ✅ NSIS installer + portable build configuration
- ✅ Print support via OS dialog

**Security Features:**
- Node integration disabled
- Context isolation enabled
- Sandboxed renderer
- CSP headers enforced
- External links open in browser only

---

## 🚀 Development

### Prerequisites
- Node.js 20+
- npm or bun
- Windows 10/11 (for building Windows installer)

### Run Development Server
```bash
# Start Vite dev server with Electron
npm run dev:electron
```

### Build for Production
```bash
# Build Vite + compile TypeScript + package with electron-builder
npm run build:electron
npm run dist
```

### Outputs
- **NSIS Installer**: `release/LuxuryHotelPro-Setup-{version}.exe`
- **Portable**: `release/LuxuryHotelPro-Portable-{version}.exe`

---

## 📦 IPC API Reference

The renderer process accesses Electron features via `window.electronAPI`:

```typescript
interface ElectronAPI {
  // Desktop detection
  isDesktop: boolean;

  // Offline queue (Phase 2+)
  queueRequest: (req: QueuedRequest) => Promise<void>;
  getQueueStatus: () => Promise<QueueStatus>;

  // Connectivity
  onOnlineStatusChange: (callback: (isOnline: boolean) => void) => () => void;

  // Logging
  log: (event: LogEvent) => void;

  // Printing
  printPdf: (bufferOrUrl: string | ArrayBuffer, options?: PrintOptions) => Promise<void>;

  // Auto-launch (Phase 7)
  getAutoLaunchEnabled: () => Promise<boolean>;
  setAutoLaunchEnabled: (enabled: boolean) => Promise<void>;

  // App info
  getAppVersion: () => Promise<string>;
}
```

### Usage Example

```typescript
// Detect if running in desktop
if (window.electronAPI?.isDesktop) {
  console.log('Running in Electron desktop app');
}

// Listen for network status
const cleanup = window.electronAPI?.onOnlineStatusChange((isOnline) => {
  console.log(`Network: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
});

// Print folio
await window.electronAPI?.printPdf(pdfBuffer, { copies: 1 });

// Log event
window.electronAPI?.log({
  level: 'info',
  message: 'Payment collected offline',
  context: { amount: 5000, tenant_id: 'xxx' },
  timestamp: Date.now(),
});
```

---

## 🔐 Security

### Multi-Tenant Isolation
- Each tenant gets isolated IndexedDB (Phase 2)
- All operations require `tenant_id` validation
- No cross-tenant data access possible

### Code Signing (Production)
```bash
# Windows code signing
npm run dist -- --win --publish never
# Requires EV certificate for Windows SmartScreen bypass
```

---

## 🐛 Debugging

### Logs Location
- **Windows**: `%APPDATA%/LuxuryHotelPro Offline/logs/`
- Files: `main.log`, `preload.log`, `sync.log`, `queue.log`

### Enable DevTools
Development mode automatically opens DevTools. In production:
```typescript
// Press Ctrl+Shift+I or add to main.ts temporarily:
mainWindow.webContents.openDevTools();
```

### Common Issues

**App won't start:**
- Check `main.log` for errors
- Verify Vite built `dist/` directory
- Ensure `dist-electron/` contains compiled JS

**Printing fails:**
- Check OS has printer drivers installed
- Verify PDF buffer is valid
- Check `main.log` for print errors

---

## 🎯 Roadmap

### ✅ Phase 1: Foundation (COMPLETE)
- Electron shell + IPC bridge
- Security hardening
- Logging + auto-updater foundation

### 🚧 Phase 2: Multi-Tenant IndexedDB (NEXT)
- Per-tenant databases
- Session management
- Data caching

### 📋 Phase 3-8: Coming Soon
- Offline request queue
- Sync engine
- Folio/payment integration
- Auto-launch
- Testing

---

## 📝 License

Proprietary - LuxuryHotelPro

---

## 💬 Support

For issues or questions:
- Check logs in `%APPDATA%/LuxuryHotelPro Offline/logs/`
- Review this documentation
- Contact development team
