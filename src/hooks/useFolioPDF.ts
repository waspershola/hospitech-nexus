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

      console.log('[useFolioPDF] BILLING-CENTER-V2: Generating PDF for folio:', params.folioId);

      try {
        const { data, error } = await supabase.functions.invoke('generate-folio-pdf', {
          body: {
            folio_id: params.folioId,
            tenant_id: tenantId,
            format: params.format || 'A4',
            include_qr: params.includeQR !== false,
          },
        });

        console.log('[useFolioPDF] BILLING-CENTER-V2: Response:', { data, error });

        if (error) {
          console.error('[useFolioPDF] BILLING-CENTER-V2: Edge function error:', error);
          throw new Error(error.message || 'Edge function error');
        }
        
        if (!data) {
          console.error('[useFolioPDF] BILLING-CENTER-V2: No data returned');
          throw new Error('No data returned from edge function');
        }

        if (!data.success) {
          console.error('[useFolioPDF] BILLING-CENTER-V2: Operation failed:', data.error);
          throw new Error(data.error || 'Failed to generate folio PDF');
        }

        return data;
      } catch (err) {
        console.error('[useFolioPDF] BILLING-CENTER-V2: Caught error:', err);
        throw err;
      }
    },
    onSuccess: (data) => {
      console.log('[useFolioPDF] BILLING-CENTER-V2: PDF generated successfully:', {
        pdf_url: data.pdf_url,
        version: data.version,
        template_version: data.metadata?.template_version,
        storage_path: data.metadata?.storage_path
      });
      toast.success('Folio PDF generated successfully');
    },
    onError: (error: Error) => {
      console.error('[useFolioPDF] BILLING-CENTER-V2: Error in generatePDF:', error);
      toast.error(`Failed to generate folio PDF: ${error.message}`);
    },
  });

  const printFolio = useMutation({
    mutationFn: async (params: GenerateFolioPDFParams) => {
      console.log('[useFolioPDF] BILLING-CENTER-V2: Print workflow starting');
      
      // First generate the PDF
      const pdfData = await generatePDF.mutateAsync(params);
      
      console.log('[useFolioPDF] BILLING-CENTER-V2: Fetching HTML for print:', {
        pdf_url: pdfData.pdf_url,
        version: pdfData.version,
        template_version: pdfData.metadata?.template_version
      });
      
      // Fetch the HTML content and create a proper blob URL to ensure it renders
      const response = await fetch(pdfData.pdf_url);
      const htmlContent = await response.text();
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      
      // Open blob URL in new window for printing
      window.open(blobUrl, '_blank');
      
      return pdfData;
    },
    onSuccess: () => {
      console.log('[useFolioPDF] BILLING-CENTER-V2: Print workflow complete');
      toast.success('Folio ready for printing');
    },
    onError: (error: Error) => {
      console.error('[useFolioPDF] BILLING-CENTER-V2: Print workflow failed:', error);
      toast.error(`Failed to print folio: ${error.message}`);
    },
  });

  const downloadFolio = useMutation({
    mutationFn: async (params: GenerateFolioPDFParams) => {
      console.log('[useFolioPDF] PDF-TEMPLATE-V4: Download workflow starting');

      // Reuse the same server-generated HTML that print uses
      const pdfData = await generatePDF.mutateAsync(params);

      console.log('[useFolioPDF] PDF-TEMPLATE-V4: Using server-generated HTML for download (same as print):', {
        html_url: pdfData.html_url,
        pdf_url: pdfData.pdf_url,
        version: pdfData.version,
        template_version: pdfData.metadata?.template_version,
      });

      // Prefer the URL that print uses so layout is identical
      const downloadUrl = pdfData.pdf_url || pdfData.html_url;
      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
      } else {
        throw new Error('No folio URL available for download');
      }

      return pdfData;
    },
    onSuccess: () => {
      toast.success('Folio opened in a new tab. Use Print → Save as PDF to download.');
    },
    onError: (error: Error) => {
      console.error('[useFolioPDF] PDF-TEMPLATE-V4: Download failed', error);
      toast.error(`Failed to open folio for download: ${error.message}`);
    },
  });

  const emailFolio = useMutation({
    mutationFn: async (params: EmailFolioParams) => {
      if (!tenantId) throw new Error('No tenant ID');

      console.log('[useFolioPDF] BILLING-CENTER-V2-EMAIL: Starting email workflow');

      // Generate the latest V4 HTML snapshot
      const pdfData = await generatePDF.mutateAsync({
        folioId: params.folioId,
        format: params.format,
        includeQR: params.includeQR,
      });

      // Always prefer the same URL used by print/download so template stays in sync
      const pdfUrlForEmail = pdfData.pdf_url || pdfData.html_url;
      if (!pdfUrlForEmail) {
        throw new Error('No folio URL available for email');
      }

      console.log('[useFolioPDF] BILLING-CENTER-V2-EMAIL: Sending email with folio URL (print/download template)', {
        pdfUrlForEmail,
        version: pdfData.version,
        template_version: pdfData.metadata?.template_version,
      });

      // Send email using dedicated folio email function with server-generated URL
      const { data, error } = await supabase.functions.invoke('send-folio-email', {
        body: {
          tenant_id: tenantId,
          folio_id: params.folioId,
          guest_email: params.guestEmail,
          guest_name: params.guestName,
          pdf_url: pdfUrlForEmail,
        },
      });

      if (error) {
        console.error('[useFolioPDF] BILLING-CENTER-V2-EMAIL: Error', error);
        throw error;
      }
      
      if (!data.success) {
        console.error('[useFolioPDF] BILLING-CENTER-V2-EMAIL: Failed', data.error);
        throw new Error(data.error || 'Failed to send email');
      }

      console.log('[useFolioPDF] BILLING-CENTER-V2-EMAIL: Success', data.message_id);
      return data;
    },
    onSuccess: () => {
      console.log('[useFolioPDF] BILLING-CENTER-V2-EMAIL: Complete');
      toast.success('Folio emailed to guest successfully');
    },
    onError: (error: Error) => {
      console.error('[useFolioPDF] BILLING-CENTER-V2-EMAIL: Failed workflow', error);
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
