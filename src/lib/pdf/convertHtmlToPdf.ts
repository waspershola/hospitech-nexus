import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * BILLING-PDF-V3: Client-side HTML to PDF conversion
 * Shared utilities for converting folio HTML into real PDFs.
 */

async function fetchHtmlIntoIframe(htmlUrl: string, timeoutMs = 10000): Promise<{ iframe: HTMLIFrameElement; doc: Document }> {
  console.log('[convertHtmlToPdf] PDF-TEMPLATE-V3: Fetching HTML', { htmlUrl });

  const res = await fetch(htmlUrl, { mode: 'cors' });
  if (!res.ok) {
    throw new Error(`Could not fetch folio HTML: ${res.status}`);
  }
  const htmlString = await res.text();

  console.log('[convertHtmlToPdf] PDF-TEMPLATE-V3: HTML fetched, creating iframe');

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = '210mm';
  iframe.style.height = '297mm';
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

  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => resolve(), timeoutMs);
    iframe.onload = () => {
      clearTimeout(timer);
      setTimeout(() => resolve(), 500);
    };
  });

  return { iframe, doc };
}

function renderIframeToPdf(doc: Document, iframe: HTMLIFrameElement): jsPDF {
  console.log('[convertHtmlToPdf] PDF-TEMPLATE-V3: Rendering to canvas...');

  const iframeBody = doc.body;
  const canvas = (window as any).html2canvasInstance
    ? (window as any).html2canvasInstance
    : null;

  // We still use html2canvas directly to avoid global hacks
  return new jsPDF('p', 'mm', 'a4');
}

export async function convertHtmlToPdfAndDownload(
  htmlUrl: string,
  filename = 'folio.pdf',
  timeoutMs = 10000
) {
  console.log('[convertHtmlToPdf] PDF-TEMPLATE-V3-MULTI-FOLIO: Starting conversion', { htmlUrl, filename });

  const { iframe, doc } = await fetchHtmlIntoIframe(htmlUrl, timeoutMs);

  try {
    const iframeBody = doc.body;
    const canvas = await html2canvas(iframeBody, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');

    console.log('[convertHtmlToPdf] PDF-TEMPLATE-V3: Creating PDF document...');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgProps = { width: canvas.width, height: canvas.height };
    const pxToMm = 25.4 / 96;
    let imgWidthMM = (imgProps.width / 2) * pxToMm;
    let imgHeightMM = (imgProps.height / 2) * pxToMm;

    if (imgWidthMM > pageWidth) {
      const ratio = pageWidth / imgWidthMM;
      imgWidthMM = pageWidth;
      imgHeightMM = imgHeightMM * ratio;
    }

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidthMM, imgHeightMM);

    console.log('[convertHtmlToPdf] PDF-TEMPLATE-V3: Saving PDF...', { filename });

    pdf.save(filename);

    console.log('[convertHtmlToPdf] PDF-TEMPLATE-V3-MULTI-FOLIO: Conversion complete');
  } catch (error) {
    console.error('[convertHtmlToPdf] PDF-TEMPLATE-V3: Conversion failed', error);
    throw error;
  } finally {
    document.body.removeChild(iframe);
  }
}

// New helper: return a Blob so we can upload to Supabase for email attachments
export async function convertHtmlToPdfBlob(
  htmlUrl: string,
  timeoutMs = 10000
): Promise<Blob> {
  console.log('[convertHtmlToPdfBlob] PDF-TEMPLATE-V3: Starting conversion to Blob', { htmlUrl });

  const { iframe, doc } = await fetchHtmlIntoIframe(htmlUrl, timeoutMs);

  try {
    const canvas = await html2canvas(doc.body, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();

    const imgProps = { width: canvas.width, height: canvas.height };
    const pxToMm = 25.4 / 96;
    let imgWidthMM = (imgProps.width / 2) * pxToMm;
    let imgHeightMM = (imgProps.height / 2) * pxToMm;

    if (imgWidthMM > pageWidth) {
      const ratio = pageWidth / imgWidthMM;
      imgWidthMM = pageWidth;
      imgHeightMM = imgHeightMM * ratio;
    }

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidthMM, imgHeightMM);

    const blob = pdf.output('blob');
    console.log('[convertHtmlToPdfBlob] PDF-TEMPLATE-V3: Blob created', { size: (blob as any).size });
    return blob as Blob;
  } catch (error) {
    console.error('[convertHtmlToPdfBlob] PDF-TEMPLATE-V3: Conversion failed', error);
    throw error;
  } finally {
    document.body.removeChild(iframe);
  }
}
