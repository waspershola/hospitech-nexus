/**
 * Electron Main Process - LuxuryHotelPro Offline Desktop
 * PHASE 1: Foundation & Security
 * 
 * Secure Electron shell with:
 * - contextIsolation + sandbox
 * - Typed IPC handlers
 * - Auto-updater
 * - Window management
 */

import { app, BrowserWindow, ipcMain, shell, net } from 'electron';
import { autoUpdater } from 'electron-updater';
import AutoLaunch from 'auto-launch';
import * as path from 'path';
import * as fs from 'fs';
import type { QueuedRequest, QueueStatus, LogEvent, PrintOptions, UpdateCheckResult, UpdateInfo } from './types';
import { getSpaLoadMode, getRemoteSpaUrl, getLocalSpaPath } from './config/loadConfig';

// ============= Configuration =============

const isDevelopment = process.env.NODE_ENV === 'development';
const spaLoadMode = getSpaLoadMode();

// Logging directory
const LOG_DIR = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ============= Logging System =============

class Logger {
  private mainLogPath: string;

  constructor() {
    this.mainLogPath = path.join(LOG_DIR, 'main.log');
  }

  log(level: string, message: string, context?: any) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}${
      context ? ' ' + JSON.stringify(context) : ''
    }\n`;
    
    fs.appendFileSync(this.mainLogPath, logLine);
    console.log(logLine.trim());
  }

  info(message: string, context?: any) {
    this.log('info', message, context);
  }

  error(message: string, context?: any) {
    this.log('error', message, context);
  }

  warn(message: string, context?: any) {
    this.log('warn', message, context);
  }
}

const logger = new Logger();

// ============= Window Management =============

let mainWindow: BrowserWindow | null = null;

function createMainWindow() {
  logger.info('Creating main window');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'LuxuryHotelPro - Offline Desktop',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
  });

  // CSP Headers for security
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: https:; " +
          "font-src 'self' data:; " +
          "connect-src 'self' https://akchmpmzcupzjaeewdui.supabase.co wss://akchmpmzcupzjaeewdui.supabase.co;"
        ]
      }
    });
  });

  // Load app based on configured mode (Phase 19: Local SPA Boot)
  logger.info(`[PHASE-19-LOCAL-SPA-BOOT] Loading SPA in ${spaLoadMode} mode`);
  
  if (spaLoadMode === 'local') {
    const localPath = path.join(__dirname, getLocalSpaPath());
    logger.info(`Loading local SPA from: ${localPath}`);
    mainWindow.loadFile(localPath);
  } else {
    const remoteUrl = getRemoteSpaUrl();
    logger.info(`Loading remote SPA from: ${remoteUrl}`);
    mainWindow.loadURL(remoteUrl);
  }
  
  // Open DevTools in development
  if (isDevelopment) {
    mainWindow.webContents.openDevTools();
  }

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  logger.info('Main window created successfully');
}

// ============= Network Status Monitoring =============

let isOnline = true;

function setupNetworkMonitoring() {
  const checkOnlineStatus = () => {
    const currentStatus = net.isOnline();
    if (currentStatus !== isOnline) {
      isOnline = currentStatus;
      logger.info(`Network status changed: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
      
      // Notify renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('network:status', isOnline);
      }
    }
  };

  // Check every 5 seconds
  setInterval(checkOnlineStatus, 5000);
  checkOnlineStatus(); // Initial check
}

// ============= IPC Handlers =============

// Queue management (Phase 2 will implement actual queue logic)
ipcMain.handle('queue:add', async (_event, req: QueuedRequest) => {
  logger.info('Queue request received', { id: req.id, method: req.method, url: req.url });
  // TODO: Phase 2 - Store in IndexedDB
  return;
});

ipcMain.handle('queue:status', async (): Promise<QueueStatus> => {
  // TODO: Phase 2 - Read from IndexedDB
  return {
    pending: 0,
    failed: 0,
    syncing: false,
    lastSyncAt: null,
  };
});

// Logging
ipcMain.on('log:event', (_event, logEvent: LogEvent) => {
  logger.log(logEvent.level, logEvent.message, logEvent.context);
});

// Auto-sync scheduler - runs every 5 minutes when online
let syncInterval: NodeJS.Timeout | null = null;

const startSyncScheduler = () => {
  if (syncInterval) return;
  
  syncInterval = setInterval(() => {
    if (isOnline && mainWindow && !mainWindow.isDestroyed()) {
      logger.info('Triggering scheduled sync');
      mainWindow.webContents.send('sync:trigger');
    }
  }, 5 * 60 * 1000); // Every 5 minutes
};

const stopSyncScheduler = () => {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
};

// Start sync scheduler
startSyncScheduler();

// Stop sync scheduler on app quit
app.on('before-quit', () => {
  stopSyncScheduler();
});

// Printing - PDF
ipcMain.handle('print:pdf', async (_event, { bufferOrUrl, options }: { bufferOrUrl: string | ArrayBuffer; options?: PrintOptions }) => {
  logger.info('Print PDF request received');
  
  if (!mainWindow) {
    throw new Error('Main window not available');
  }

  try {
    // Create temporary window for printing
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    if (typeof bufferOrUrl === 'string') {
      await printWindow.loadURL(bufferOrUrl);
    } else {
      // Convert ArrayBuffer to data URL
      const blob = Buffer.from(bufferOrUrl);
      const dataUrl = `data:application/pdf;base64,${blob.toString('base64')}`;
      await printWindow.loadURL(dataUrl);
    }

    await printWindow.webContents.print(options || {});
    printWindow.close();
    
    logger.info('Print PDF completed successfully');
  } catch (error) {
    logger.error('Print PDF failed', { error: String(error) });
    throw error;
  }
});

// Printing - HTML
ipcMain.handle('print:html', async (_event, htmlContent: string) => {
  logger.info('Print HTML request received');
  
  if (!mainWindow) {
    throw new Error('Main window not available');
  }

  try {
    // Create temporary window for printing
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    // Load HTML content with proper encoding
    const encodedHtml = encodeURIComponent(htmlContent);
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodedHtml}`);

    // Wait for content to render
    await new Promise(resolve => setTimeout(resolve, 500));

    // Print with options
    await printWindow.webContents.print({
      silent: false,
      printBackground: true,
      margins: { marginType: 'none' },
    });
    
    printWindow.close();
    logger.info('Print HTML completed successfully');
  } catch (error) {
    logger.error('Print HTML failed', { error: String(error) });
    throw error;
  }
});

// ============= Auto-Launch Setup =============

const autoLauncher = new AutoLaunch({
  name: 'LuxuryHotelPro',
  path: app.getPath('exe'),
});

// Auto-launch handlers
ipcMain.handle('autolaunch:get', async (): Promise<boolean> => {
  try {
    return await autoLauncher.isEnabled();
  } catch (error) {
    logger.error('Failed to check auto-launch status', { error: String(error) });
    return false;
  }
});

ipcMain.handle('autolaunch:set', async (_event, enabled: boolean) => {
  logger.info(`Auto-launch ${enabled ? 'enabled' : 'disabled'}`);
  
  try {
    if (enabled) {
      await autoLauncher.enable();
    } else {
      await autoLauncher.disable();
    }
  } catch (error) {
    logger.error('Failed to set auto-launch', { error: String(error) });
    throw error;
  }
});

// App version
ipcMain.handle('app:version', async (): Promise<string> => {
  return app.getVersion();
});

// ============= Auto-Updater (Phase 7) =============

function setupAutoUpdater() {
  if (isDevelopment) {
    logger.info('Auto-updater disabled in development');
    return;
  }

  // Configure auto-updater
  autoUpdater.logger = {
    info: (msg: string) => logger.info(`[UPDATER] ${msg}`),
    warn: (msg: string) => logger.warn(`[UPDATER] ${msg}`),
    error: (msg: string) => logger.error(`[UPDATER] ${msg}`),
    debug: (msg: string) => logger.info(`[UPDATER] ${msg}`),
  };

  autoUpdater.autoDownload = false; // Manual download control
  autoUpdater.autoInstallOnAppQuit = true; // Install on quit

  // Update available
  autoUpdater.on('update-available', (info) => {
    logger.info('Update available', { version: info.version });
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update:available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes || 'No release notes available',
      });
    }
  });

  // No update available
  autoUpdater.on('update-not-available', () => {
    logger.info('No updates available');
  });

  // Download progress
  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update:progress', progress.percent);
    }
  });

  // Update downloaded
  autoUpdater.on('update-downloaded', (info) => {
    logger.info('Update downloaded - ready to install', { version: info.version });
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      const updateInfo: UpdateInfo = {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes || 'No release notes available',
        downloadUrl: '',
      };
      mainWindow.webContents.send('update:downloaded', updateInfo);
    }
  });

  // Error handling
  autoUpdater.on('error', (error) => {
    logger.error('Auto-updater error', { error: String(error) });
  });

  // Check for updates on startup (after 3 seconds)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(err => {
      logger.error('Update check failed', { error: String(err) });
    });
  }, 3000);

  // Check for updates every 4 hours
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(err => {
      logger.error('Scheduled update check failed', { error: String(err) });
    });
  }, 4 * 60 * 60 * 1000);
}

// Auto-update IPC handlers
ipcMain.handle('update:check', async (): Promise<UpdateCheckResult> => {
  logger.info('Manual update check requested');
  
  try {
    const result = await autoUpdater.checkForUpdates();
    
    if (result && result.updateInfo) {
      const info: UpdateInfo = {
        version: result.updateInfo.version,
        releaseDate: result.updateInfo.releaseDate,
        releaseNotes: result.updateInfo.releaseNotes || 'No release notes available',
        downloadUrl: '',
      };
      
      return {
        available: true,
        info,
      };
    }
    
    return {
      available: false,
      info: null,
    };
  } catch (error) {
    logger.error('Update check failed', { error: String(error) });
    return {
      available: false,
      info: null,
    };
  }
});

ipcMain.handle('update:download', async (): Promise<void> => {
  logger.info('Update download requested');
  
  try {
    await autoUpdater.downloadUpdate();
  } catch (error) {
    logger.error('Update download failed', { error: String(error) });
    throw error;
  }
});

ipcMain.handle('update:install', async (): Promise<void> => {
  logger.info('Update install requested - quitting and installing');
  
  // This will quit the app and install the update
  autoUpdater.quitAndInstall(false, true);
});

// ============= App Lifecycle =============

app.whenReady().then(() => {
  logger.info('App ready - initializing');

  createMainWindow();
  setupNetworkMonitoring();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  logger.info('All windows closed - quitting app');
  app.quit();
});

// Handle crashes
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: String(error), stack: error.stack });
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
});

logger.info('Electron main process started', { 
  version: app.getVersion(), 
  isDevelopment,
  spaLoadMode,
  marker: 'PHASE-19-LOCAL-SPA-BOOT'
});
