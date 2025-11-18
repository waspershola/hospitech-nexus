import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface GenerateFolioPDFParams {
  folioId: string;
  format?: 'A4' | 'letter';
  includeQR?: boolean;
}

interface EmailFolioParams extends GenerateFolioPDFParams {
  guestEmail: string;
  guestName: string;
}

/**
 * Hook for generating and managing guest folio PDFs
 * 
 * Features:
 * - Generate luxury modern folio PDFs
 * - Print folio to configured printer
 * - Download folio as HTML/PDF
 * - Email folio to guest
 * - Auto-generate on checkout
 */
export function useFolioPDF() {
  const { tenantId } = useAuth();

  const generatePDF = useMutation({
    mutationFn: async (params: GenerateFolioPDFParams) => {
      if (!tenantId) throw new Error('No tenant ID');

      console.log('[useFolioPDF] Generating PDF for folio:', params.folioId);

      const { data, error } = await supabase.functions.invoke('generate-folio-pdf', {
        body: {
          folio_id: params.folioId,
          tenant_id: tenantId,
          format: params.format || 'A4',
          include_qr: params.includeQR !== false,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to generate folio PDF');

      return data;
    },
    onSuccess: (data) => {
      console.log('[useFolioPDF] PDF generated:', data.pdf_url);
      toast.success('Folio PDF generated successfully');
    },
    onError: (error: Error) => {
      console.error('[useFolioPDF] Error:', error);
      toast.error(`Failed to generate folio PDF: ${error.message}`);
    },
  });

  const printFolio = useMutation({
    mutationFn: async (params: GenerateFolioPDFParams) => {
      // First generate the PDF
      const pdfData = await generatePDF.mutateAsync(params);
      
      // Open PDF in new window for printing
      window.open(pdfData.pdf_url, '_blank');
      
      return pdfData;
    },
    onSuccess: () => {
      toast.success('Folio ready for printing');
    },
    onError: (error: Error) => {
      toast.error(`Failed to print folio: ${error.message}`);
    },
  });

  const downloadFolio = useMutation({
    mutationFn: async (params: GenerateFolioPDFParams) => {
      // Generate the PDF
      const pdfData = await generatePDF.mutateAsync(params);
      
      // Create download link
      const link = document.createElement('a');
      link.href = pdfData.pdf_url;
      link.download = `folio_${params.folioId}_${Date.now()}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return pdfData;
    },
    onSuccess: () => {
      toast.success('Folio downloaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to download folio: ${error.message}`);
    },
  });

  const emailFolio = useMutation({
    mutationFn: async (params: EmailFolioParams) => {
      if (!tenantId) throw new Error('No tenant ID');

      console.log('[useFolioPDF] PDF-V2.1-EMAIL: Starting email workflow');

      // First generate the PDF
      const pdfData = await generatePDF.mutateAsync({
        folioId: params.folioId,
        format: params.format,
        includeQR: params.includeQR,
      });

      console.log('[useFolioPDF] PDF-V2.1-EMAIL: PDF generated, sending email');

      // Send email using dedicated folio email function
      const { data, error } = await supabase.functions.invoke('send-folio-email', {
        body: {
          tenant_id: tenantId,
          folio_id: params.folioId,
          guest_email: params.guestEmail,
          guest_name: params.guestName,
          pdf_url: pdfData.pdf_url,
        },
      });

      if (error) {
        console.error('[useFolioPDF] PDF-V2.1-EMAIL: Error', error);
        throw error;
      }
      
      if (!data.success) {
        console.error('[useFolioPDF] PDF-V2.1-EMAIL: Failed', data.error);
        throw new Error(data.error || 'Failed to send email');
      }

      console.log('[useFolioPDF] PDF-V2.1-EMAIL: Success', data.message_id);
      return data;
    },
    onSuccess: () => {
      toast.success('Folio emailed to guest successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to email folio: ${error.message}`);
    },
  });

  return {
    generatePDF: generatePDF.mutate,
    printFolio: printFolio.mutate,
    downloadFolio: downloadFolio.mutate,
    emailFolio: emailFolio.mutate,
    isGenerating: generatePDF.isPending,
    isPrinting: printFolio.isPending,
    isDownloading: downloadFolio.isPending,
    isEmailing: emailFolio.isPending,
  };
}
