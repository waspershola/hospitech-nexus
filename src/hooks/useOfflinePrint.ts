/**
 * OFFLINE-DESKTOP-V1: React hook for offline printing
 * Handles printing for receipts, folios, and QR codes with offline support
 * GUARDED: Only initializes print manager in Electron context
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { isElectronContext } from '@/lib/environment/isElectron';

// Types for print options
export interface PrintReceiptOptions {
  tenantId: string;
  paymentId: string;
  bookingId: string;
}

export interface PrintFolioOptions {
  tenantId: string;
  folioId: string;
}

// Lazy-loaded print manager (Electron-only)
let printManager: any = null;

export function useOfflinePrint() {
  const inElectron = isElectronContext();
  const [initialized, setInitialized] = useState(false);
  const [isPrintingReceipt, setIsPrintingReceipt] = useState(false);
  const [isPrintingFolio, setIsPrintingFolio] = useState(false);

  // Lazy load print manager only in Electron
  useEffect(() => {
    if (!inElectron) return;
    
    const loadPrintManager = async () => {
      try {
        const module = await import('@/lib/offline/offlinePrintManager');
        printManager = module.getOfflinePrintManager();
        setInitialized(true);
      } catch (err) {
        console.warn('[useOfflinePrint] Failed to load print manager:', err);
      }
    };
    
    loadPrintManager();
  }, [inElectron]);

  const printReceipt = useCallback(async (options: PrintReceiptOptions) => {
    if (!inElectron || !initialized || !printManager) {
      toast.error('Printing is only available in the desktop app');
      return;
    }

    setIsPrintingReceipt(true);
    try {
      console.log('[useOfflinePrint] PRINT-RECEIPT-V1', options);
      
      if (!navigator.onLine && window.electronAPI) {
        // Offline mode in Electron - print from local data
        await printManager.printReceiptOffline(options);
        toast.success('Receipt sent to printer (offline mode)');
      } else {
        // Online mode - use local data
        await printManager.printReceiptOffline(options);
        toast.success('Receipt sent to printer');
      }
    } catch (error: any) {
      console.error('[useOfflinePrint] Print receipt error:', error);
      toast.error(error?.message || 'Failed to print receipt');
    } finally {
      setIsPrintingReceipt(false);
    }
  }, [inElectron, initialized]);

  const printFolio = useCallback(async (options: PrintFolioOptions) => {
    if (!inElectron || !initialized || !printManager) {
      toast.error('Printing is only available in the desktop app');
      return;
    }

    setIsPrintingFolio(true);
    try {
      console.log('[useOfflinePrint] PRINT-FOLIO-V1', options);
      
      if (!navigator.onLine && window.electronAPI) {
        // Offline mode in Electron - print from local data
        await printManager.printFolioOffline(options);
        toast.success('Folio sent to printer (offline mode)');
      } else {
        // Online mode - use local data
        await printManager.printFolioOffline(options);
        toast.success('Folio sent to printer');
      }
    } catch (error: any) {
      console.error('[useOfflinePrint] Print folio error:', error);
      toast.error(error?.message || 'Failed to print folio');
    } finally {
      setIsPrintingFolio(false);
    }
  }, [inElectron, initialized]);

  return {
    printReceipt,
    printFolio,
    isPrintingReceipt,
    isPrintingFolio,
    isAvailable: inElectron && initialized,
  };
}
