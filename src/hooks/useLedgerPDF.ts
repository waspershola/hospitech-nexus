import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { LedgerEntry } from '@/types/ledger';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// Helper functions
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [59, 130, 246];
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency || 'NGN',
  }).format(amount);
}

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
      const primaryColor: [number, number, number] = branding?.primary_color 
        ? hexToRgb(branding.primary_color) 
        : [59, 130, 246];

      let currentY = 15;

      // Hotel Logo (if available)
      if (branding?.logo_url) {
        try {
          const img = new Image();
          img.src = branding.logo_url;
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
          doc.addImage(img, 'PNG', 15, currentY, 30, 15);
        } catch (error) {
          console.warn('Failed to load logo:', error);
        }
      }

      // Header
      doc.setFontSize(20);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(hotelMeta?.hotel_name || 'Hotel', pageWidth / 2, currentY + 10, { align: 'center' });
      currentY += 18;

      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Accounting Ledger Report', pageWidth / 2, currentY, { align: 'center' });
      currentY += 8;

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, pageWidth / 2, currentY, {
        align: 'center',
      });
      currentY += 8;

      // Summary Section
      const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);
      const totalDebit = entries
        .filter(e => ['debit', 'pos', 'cash', 'invoice'].includes(e.transaction_type))
        .reduce((sum, e) => sum + e.amount, 0);
      const totalCredit = entries
        .filter(e => ['credit', 'refund', 'reversal', 'wallet_topup', 'wallet_deduction'].includes(e.transaction_type))
        .reduce((sum, e) => sum + e.amount, 0);

      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(15, currentY, pageWidth - 30, 18, 'F');
      
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(`Total Entries: ${entries.length}`, 20, currentY + 6);
      doc.text(
        `Debits: ${formatCurrency(totalDebit, entries[0]?.currency || 'NGN')}`,
        20,
        currentY + 12
      );
      doc.text(
        `Credits: ${formatCurrency(totalCredit, entries[0]?.currency || 'NGN')}`,
        pageWidth / 2,
        currentY + 12,
        { align: 'center' }
      );
      doc.text(
        `Net: ${formatCurrency(totalDebit - totalCredit, entries[0]?.currency || 'NGN')}`,
        pageWidth - 20,
        currentY + 12,
        { align: 'right' }
      );
      currentY += 22;

      doc.setTextColor(0, 0, 0);

      // Table data
      const tableData = entries.map(entry => [
        format(new Date(entry.created_at), 'MMM dd, HH:mm'),
        ((entry as any).ledger_reference || entry.id.slice(0, 8)).toString(),
        entry.transaction_type.replace('_', ' ').toUpperCase(),
        entry.guest_name || '-',
        entry.room_number || '-',
        entry.payment_method?.replace('_', ' ') || '-',
        formatCurrency(entry.amount, entry.currency || 'NGN'),
        entry.status?.toUpperCase() || '-',
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Ref', 'Type', 'Guest', 'Room', 'Method', 'Amount', 'Status']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center',
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 3,
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 18 },
          2: { cellWidth: 24, fontStyle: 'bold' },
          3: { cellWidth: 28 },
          4: { cellWidth: 16 },
          5: { cellWidth: 22 },
          6: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
          7: { cellWidth: 20, halign: 'center' },
        },
        didDrawPage: (data) => {
          // Footer on each page
          const pageHeight = doc.internal.pageSize.getHeight();
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          
          // Page number
          const pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber;
          const totalPages = (doc as any).internal.getNumberOfPages();
          doc.text(
            `Page ${pageNum} of ${totalPages}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
          
          // Hotel info
          if (hotelMeta?.contact_email || hotelMeta?.contact_phone) {
            doc.text(
              `${hotelMeta.contact_email || ''} • ${hotelMeta.contact_phone || ''}`,
              pageWidth / 2,
              pageHeight - 6,
              { align: 'center' }
            );
          }
        },
      });

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
