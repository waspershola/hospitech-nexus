import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Mail, MoreVertical, Printer } from 'lucide-react';
import { useFolioPDF } from '@/hooks/useFolioPDF';

interface FolioActionsMenuProps {
  folioId: string;
  guestEmail?: string | null;
  guestName?: string;
  disabled?: boolean;
}

export function FolioActionsMenu({ 
  folioId, 
  guestEmail, 
  guestName, 
  disabled = false 
}: FolioActionsMenuProps) {
  const { printFolio, downloadFolio, emailFolio, isPrinting, isDownloading, isEmailing } = useFolioPDF();

  const handlePrint = () => {
    printFolio({ folioId });
  };

  const handleDownload = () => {
    downloadFolio({ folioId });
  };

  const handleEmail = () => {
    if (!guestEmail || !guestName) {
      return;
    }
    emailFolio({ folioId, guestEmail, guestName });
  };

  const isLoading = isPrinting || isDownloading || isEmailing;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          disabled={disabled || isLoading}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Folio Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handlePrint} disabled={isPrinting}>
          <Printer className="mr-2 h-4 w-4" />
          {isPrinting ? 'Preparing...' : 'Print Folio'}
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleDownload} disabled={isDownloading}>
          <Download className="mr-2 h-4 w-4" />
          {isDownloading ? 'Preparing...' : 'Download PDF'}
        </DropdownMenuItem>
        
        {guestEmail && (
          <DropdownMenuItem onClick={handleEmail} disabled={isEmailing || !guestEmail}>
            <Mail className="mr-2 h-4 w-4" />
            {isEmailing ? 'Sending...' : 'Email to Guest'}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
