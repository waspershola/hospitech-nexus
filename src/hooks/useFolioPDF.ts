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

      // First generate the PDF
      const pdfData = await generatePDF.mutateAsync({
        folioId: params.folioId,
        format: params.format,
        includeQR: params.includeQR,
      });

      // Send email with PDF link
      const { data, error } = await supabase.functions.invoke('send-email-notification', {
        body: {
          to: params.guestEmail,
          subject: 'Your Stay Folio',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Thank You for Your Stay</h2>
              <p>Dear ${params.guestName},</p>
              <p>Please find your stay folio attached below:</p>
              <p style="margin: 2rem 0;">
                <a href="${pdfData.pdf_url}" 
                   style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  View Folio
                </a>
              </p>
              <p>We appreciate your patronage and look forward to serving you again.</p>
              <p>Best regards,<br>Hotel Management</p>
            </div>
          `,
          tenant_id: tenantId,
        },
      });

      if (error) throw error;
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
