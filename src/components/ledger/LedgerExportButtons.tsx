import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useLedgerExport } from '@/hooks/useLedgerExport';
import { useLedgerPDF } from '@/hooks/useLedgerPDF';
import type { LedgerEntry } from '@/types/ledger';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LedgerExportButtonsProps {
  entries: LedgerEntry[];
  onPrint?: () => void;
}

export function LedgerExportButtons({ entries, onPrint }: LedgerExportButtonsProps) {
  const { exportToCSV, exportToExcel, isExporting } = useLedgerExport();
  const { generatePDF, isGenerating } = useLedgerPDF();

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (!entries.length) {
      return;
    }

    switch (format) {
      case 'csv':
        exportToCSV(entries);
        break;
      case 'excel':
        exportToExcel(entries);
        break;
      case 'pdf':
        generatePDF(entries);
        break;
    }
  };

  const disabled = !entries.length || isExporting || isGenerating;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileText className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('excel')}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pdf')}>
          <FileText className="h-4 w-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
        {onPrint && (
          <DropdownMenuItem onClick={onPrint}>
            <FileText className="h-4 w-4 mr-2" />
            Print Ledger
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
