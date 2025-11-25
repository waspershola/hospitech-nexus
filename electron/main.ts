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
import * as path from 'path';
import * as fs from 'fs';
import type { QueuedRequest, QueueStatus, LogEvent, PrintOptions } from './types';

// ============= Configuration =============

const isDevelopment = process.env.NODE_ENV === 'development';
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:8080';

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

  // Load app
  if (isDevelopment) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
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

// Printing
ipcMain.handle('print:pdf', async (_event, { bufferOrUrl, options }: { bufferOrUrl: string | ArrayBuffer; options?: PrintOptions }) => {
  logger.info('Print request received');
  
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
    
    logger.info('Print completed successfully');
  } catch (error) {
    logger.error('Print failed', { error: String(error) });
    throw error;
  }
});

// Auto-launch
ipcMain.handle('autolaunch:get', async (): Promise<boolean> => {
  // TODO: Phase 7 - Windows registry manipulation
  return false;
});

ipcMain.handle('autolaunch:set', async (_event, enabled: boolean) => {
  logger.info(`Auto-launch ${enabled ? 'enabled' : 'disabled'}`);
  // TODO: Phase 7 - Windows registry manipulation
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

  autoUpdater.logger = {
    info: (msg: string) => logger.info(`[UPDATER] ${msg}`),
    warn: (msg: string) => logger.warn(`[UPDATER] ${msg}`),
    error: (msg: string) => logger.error(`[UPDATER] ${msg}`),
    debug: (msg: string) => logger.info(`[UPDATER] ${msg}`),
  };

  autoUpdater.on('update-available', () => {
    logger.info('Update available');
    // TODO: Phase 7 - Show toast notification
  });

  autoUpdater.on('update-downloaded', () => {
    logger.info('Update downloaded - ready to install');
    // TODO: Phase 7 - Show restart prompt
  });

  // Check for updates on startup
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(err => {
      logger.error('Update check failed', { error: String(err) });
    });
  }, 3000);
}

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

logger.info('Electron main process started', { version: app.getVersion(), isDevelopment });
