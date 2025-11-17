import { Button } from '@/components/ui/button';
import { Download, Mail, Printer } from 'lucide-react';
import { useFolioPDF } from '@/hooks/useFolioPDF';

interface FolioPDFButtonsProps {
  folioId: string;
  guestEmail?: string | null;
  guestName?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabels?: boolean;
}

/**
 * Quick action buttons for folio PDF operations
 * Used in Billing Center and other folio display contexts
 */
export function FolioPDFButtons({ 
  folioId, 
  guestEmail, 
  guestName,
  variant = 'outline',
  size = 'default',
  showLabels = true
}: FolioPDFButtonsProps) {
  const { printFolio, downloadFolio, emailFolio, isPrinting, isDownloading, isEmailing } = useFolioPDF();

  const handlePrint = () => {
    printFolio({ folioId });
  };

  const handleDownload = () => {
    downloadFolio({ folioId });
  };

  const handleEmail = () => {
    if (!guestEmail || !guestName) return;
    emailFolio({ folioId, guestEmail, guestName });
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={variant}
        size={size}
        onClick={handlePrint}
        disabled={isPrinting}
      >
        <Printer className="h-4 w-4" />
        {showLabels && <span className="ml-2">{isPrinting ? 'Preparing...' : 'Print'}</span>}
      </Button>

      <Button
        variant={variant}
        size={size}
        onClick={handleDownload}
        disabled={isDownloading}
      >
        <Download className="h-4 w-4" />
        {showLabels && <span className="ml-2">{isDownloading ? 'Downloading...' : 'Download'}</span>}
      </Button>

      {guestEmail && (
        <Button
          variant={variant}
          size={size}
          onClick={handleEmail}
          disabled={isEmailing || !guestEmail}
        >
          <Mail className="h-4 w-4" />
          {showLabels && <span className="ml-2">{isEmailing ? 'Sending...' : 'Email'}</span>}
        </Button>
      )}
    </div>
  );
}
