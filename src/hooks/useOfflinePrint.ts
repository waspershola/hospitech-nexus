/**
 * OFFLINE-DESKTOP-V1: React hook for offline printing
 * Handles printing for receipts, folios, and QR codes with offline support
 */

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getOfflinePrintManager } from '@/lib/offline/offlinePrintManager';
import type { PrintReceiptOptions, PrintFolioOptions } from '@/lib/offline/offlinePrintManager';

export function useOfflinePrint() {
  const printManager = getOfflinePrintManager();

  const printReceipt = useMutation({
    mutationFn: async (options: PrintReceiptOptions) => {
      console.log('[useOfflinePrint] PRINT-RECEIPT-V1', options);
      
      if (!navigator.onLine && window.electronAPI) {
        // Offline mode in Electron - print from local data
        await printManager.printReceiptOffline(options);
        return { success: true, mode: 'offline' };
      } else {
        // Online mode - could call edge function or use local data
        // For now, we'll use local data if available
        await printManager.printReceiptOffline(options);
        return { success: true, mode: 'online-local' };
      }
    },
    onSuccess: (data) => {
      if (data.mode === 'offline') {
        toast.success('Receipt sent to printer (offline mode)');
      } else {
        toast.success('Receipt sent to printer');
      }
    },
    onError: (error: any) => {
      console.error('[useOfflinePrint] Print receipt error:', error);
      toast.error(error?.message || 'Failed to print receipt');
    },
  });

  const printFolio = useMutation({
    mutationFn: async (options: PrintFolioOptions) => {
      console.log('[useOfflinePrint] PRINT-FOLIO-V1', options);
      
      if (!navigator.onLine && window.electronAPI) {
        // Offline mode in Electron - print from local data
        await printManager.printFolioOffline(options);
        return { success: true, mode: 'offline' };
      } else {
        // Online mode - could call edge function or use local data
        await printManager.printFolioOffline(options);
        return { success: true, mode: 'online-local' };
      }
    },
    onSuccess: (data) => {
      if (data.mode === 'offline') {
        toast.success('Folio sent to printer (offline mode)');
      } else {
        toast.success('Folio sent to printer');
      }
    },
    onError: (error: any) => {
      console.error('[useOfflinePrint] Print folio error:', error);
      toast.error(error?.message || 'Failed to print folio');
    },
  });

  return {
    printReceipt: printReceipt.mutate,
    printFolio: printFolio.mutate,
    isPrintingReceipt: printReceipt.isPending,
    isPrintingFolio: printFolio.isPending,
  };
}
