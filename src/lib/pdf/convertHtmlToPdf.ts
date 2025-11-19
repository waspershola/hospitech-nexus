import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * BILLING-PDF-V3: Client-side HTML to PDF conversion
 * Converts folio HTML to actual PDF file for download
 */
export async function convertHtmlToPdfAndDownload(
  htmlUrl: string, 
  filename = 'folio.pdf', 
  timeoutMs = 10000
) {
  console.log('[convertHtmlToPdf] PDF-TEMPLATE-V3: Starting conversion', { htmlUrl, filename });

  try {
    // Fetch HTML
    const res = await fetch(htmlUrl, { mode: 'cors' });
    if (!res.ok) {
      throw new Error(`Could not fetch folio HTML: ${res.status}`);
    }
    const htmlString = await res.text();
    
    console.log('[convertHtmlToPdf] PDF-TEMPLATE-V3: HTML fetched, creating iframe');

    // Create offscreen iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = '210mm'; // A4 width
    iframe.style.height = '297mm'; // A4 height
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      throw new Error('Could not create iframe document for PDF conversion');
    }

    doc.open();
    doc.write(htmlString);
    doc.close();

    console.log('[convertHtmlToPdf] PDF-TEMPLATE-V3: Waiting for content to render...');

    // Wait for fonts and images to load
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => resolve(), timeoutMs);
      iframe.onload = () => {
        clearTimeout(timer);
        // Extra delay for web fonts
        setTimeout(() => resolve(), 500);
      };
    });

    console.log('[convertHtmlToPdf] PDF-TEMPLATE-V3: Rendering to canvas...');

    // Render to canvas
    const iframeBody = doc.body;
    const canvas = await html2canvas(iframeBody, { 
      scale: 2, 
      useCORS: true, 
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/png');

    console.log('[convertHtmlToPdf] PDF-TEMPLATE-V3: Creating PDF document...');

    // Create PDF (A4 portrait)
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Calculate dimensions to fit A4
    const imgProps = { width: canvas.width, height: canvas.height };
    const pxToMm = 25.4 / 96; // 96 DPI standard
    let imgWidthMM = (imgProps.width / 2) * pxToMm; // /2 because scale=2
    let imgHeightMM = (imgProps.height / 2) * pxToMm;

    // Scale to fit page width if necessary
    if (imgWidthMM > pageWidth) {
      const ratio = pageWidth / imgWidthMM;
      imgWidthMM = pageWidth;
      imgHeightMM = imgHeightMM * ratio;
    }

    // Add image to PDF
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidthMM, imgHeightMM);
    
    console.log('[convertHtmlToPdf] PDF-TEMPLATE-V3: Saving PDF...', { filename });
    
    // Save PDF
    pdf.save(filename);
    
    console.log('[convertHtmlToPdf] PDF-TEMPLATE-V3: Conversion complete');
    
    // Cleanup
    document.body.removeChild(iframe);
  } catch (error) {
    console.error('[convertHtmlToPdf] PDF-TEMPLATE-V3: Conversion failed', error);
    throw error;
  }
}
