import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { LedgerEntry } from '@/types/ledger';
import { format } from 'date-fns';

export function useLedgerExport() {
  const exportToCSV = useMutation({
    mutationFn: async (entries: LedgerEntry[]) => {
      if (!entries.length) {
        throw new Error('No entries to export');
      }

      const headers = [
        'Date & Time',
        'Transaction Ref',
        'Type',
        'Guest',
        'Room',
        'Department',
        'Payment Method',
        'Amount',
        'Currency',
        'Tax',
        'Service Charge',
        'Status',
        'Reconciliation Status',
      ];

      const rows = entries.map(entry => [
        format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm:ss'),
        (entry as any).ledger_reference || entry.id.slice(0, 8),
        entry.transaction_type,
        entry.guest_name || '',
        entry.room_number || '',
        entry.department || '',
        entry.payment_method || '',
        entry.amount.toString(),
        entry.currency,
        entry.tax_amount?.toString() || '',
        entry.service_charge_amount?.toString() || '',
        entry.status,
        entry.reconciliation_status,
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ledger-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true };
    },
    onSuccess: () => {
      toast.success('Ledger exported to CSV successfully');
    },
    onError: (error: Error) => {
      toast.error(`Export failed: ${error.message}`);
    },
  });

  const exportToExcel = useMutation({
    mutationFn: async (entries: LedgerEntry[]) => {
      if (!entries.length) {
        throw new Error('No entries to export');
      }

      // For Excel, we'll use CSV with .xlsx extension for now
      // In production, you'd use a library like xlsx
      const headers = [
        'Date & Time',
        'Transaction Ref',
        'Type',
        'Guest',
        'Room',
        'Department',
        'Payment Method',
        'Amount',
        'Currency',
        'Tax',
        'Service Charge',
        'Status',
        'Reconciliation Status',
      ];

      const rows = entries.map(entry => [
        format(new Date(entry.created_at), 'yyyy-MM-dd HH:mm:ss'),
        (entry as any).ledger_reference || entry.id.slice(0, 8),
        entry.transaction_type,
        entry.guest_name || '',
        entry.room_number || '',
        entry.department || '',
        entry.payment_method || '',
        entry.amount.toString(),
        entry.currency,
        entry.tax_amount?.toString() || '',
        entry.service_charge_amount?.toString() || '',
        entry.status,
        entry.reconciliation_status,
      ]);

      const csvContent = [
        headers.join('\t'),
        ...rows.map(row => row.join('\t')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ledger-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true };
    },
    onSuccess: () => {
      toast.success('Ledger exported to Excel successfully');
    },
    onError: (error: Error) => {
      toast.error(`Export failed: ${error.message}`);
    },
  });

  return {
    exportToCSV: exportToCSV.mutate,
    exportToExcel: exportToExcel.mutate,
    isExporting: exportToCSV.isPending || exportToExcel.isPending,
  };
}
