import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { LedgerEntry } from '@/types/ledger';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export function useLedgerPDF() {
  const { tenantId } = useAuth();

  const { data: branding } = useQuery({
    queryKey: ['hotel-branding', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('hotel_branding')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: hotelMeta } = useQuery({
    queryKey: ['hotel-meta', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('hotel_meta')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const generatePDF = useMutation({
    mutationFn: async (entries: LedgerEntry[]) => {
      if (!entries.length) {
        throw new Error('No entries to export');
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(18);
      doc.text(hotelMeta?.hotel_name || 'Hotel', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.text('Accounting Ledger Report', pageWidth / 2, 30, { align: 'center' });

      doc.setFontSize(10);
      doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, pageWidth / 2, 38, {
        align: 'center',
      });

      // Table data
      const tableData = entries.map(entry => [
        format(new Date(entry.created_at), 'MMM dd, HH:mm'),
        ((entry as any).ledger_reference || entry.id.slice(0, 8)).toString(),
        entry.transaction_type.replace('_', ' '),
        entry.guest_name || '-',
        entry.room_number || '-',
        entry.payment_method || '-',
        new Intl.NumberFormat('en-NG', {
          style: 'currency',
          currency: entry.currency || 'NGN',
        }).format(entry.amount),
        entry.status,
      ]);

      autoTable(doc, {
        startY: 45,
        head: [['Date', 'Ref', 'Type', 'Guest', 'Room', 'Method', 'Amount', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8,
        },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 18 },
          2: { cellWidth: 22 },
          3: { cellWidth: 28 },
          4: { cellWidth: 18 },
          5: { cellWidth: 22 },
          6: { cellWidth: 28, halign: 'right' },
          7: { cellWidth: 20 },
        },
      });

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Save
      doc.save(`ledger-report-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.pdf`);

      return { success: true };
    },
    onSuccess: () => {
      toast.success('PDF generated successfully');
    },
    onError: (error: Error) => {
      toast.error(`PDF generation failed: ${error.message}`);
    },
  });

  return {
    generatePDF: generatePDF.mutate,
    isGenerating: generatePDF.isPending,
  };
}
