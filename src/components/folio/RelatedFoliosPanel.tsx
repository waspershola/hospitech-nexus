import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/finance/tax';
import { Check } from 'lucide-react';
import { MultiFolio } from '@/hooks/useMultiFolios';

interface RelatedFoliosPanelProps {
  folios: MultiFolio[];
  currentFolioId: string;
  onSelectFolio: (folioId: string) => void;
}

const FOLIO_TYPE_LABELS: Record<string, string> = {
  room: 'Room',
  incidentals: 'Incidentals',
  corporate: 'Corporate',
  group: 'Group',
  mini_bar: 'Mini Bar',
  spa: 'Spa',
  restaurant: 'Restaurant',
};

export function RelatedFoliosPanel({ folios, currentFolioId, onSelectFolio }: RelatedFoliosPanelProps) {
  const grandTotal = folios.reduce((sum, folio) => sum + folio.balance, 0);

  return (
    <div className="space-y-3">
      {folios.map((folio) => {
        const isActive = folio.id === currentFolioId;
        const label = FOLIO_TYPE_LABELS[folio.folio_type] || folio.folio_type;

        return (
          <Card
            key={folio.id}
            className={`p-3 cursor-pointer transition-all hover:border-primary ${
              isActive ? 'border-primary bg-primary/5' : ''
            }`}
            onClick={() => onSelectFolio(folio.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{label}</span>
                  {folio.is_primary && (
                    <Badge variant="secondary" className="text-xs">Primary</Badge>
                  )}
                  {isActive && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {folio.folio_number}
                </div>
              </div>
              <div className="text-right">
                <div className={`font-semibold text-sm ${
                  folio.balance > 0 ? 'text-destructive' : 'text-green-600'
                }`}>
                  {formatCurrency(folio.balance, 'NGN')}
                </div>
                <div className="text-xs text-muted-foreground">
                  {folio.status}
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      {folios.length > 1 && (
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">Grand Total</span>
            <span className={`font-bold ${
              grandTotal > 0 ? 'text-destructive' : 'text-green-600'
            }`}>
              {formatCurrency(grandTotal, 'NGN')}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Across {folios.length} folios
          </div>
        </div>
      )}
    </div>
  );
}
