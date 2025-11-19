import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FolioSwitcherProps {
  folios: Array<{
    id: string;
    folio_type: string;
    folio_number: string;
    balance: number;
    is_primary: boolean;
  }>;
  currentFolioId: string;
  onSwitch: (folioId: string) => void;
}

/**
 * Folio type switcher component
 * Displays pill buttons for each folio type with balance indicators
 * Version: MULTI-FOLIO-V1
 */
export function FolioSwitcher({ folios, currentFolioId, onSwitch }: FolioSwitcherProps) {
  const getFolioLabel = (type: string, isPrimary: boolean) => {
    const labels: Record<string, string> = {
      room: 'Room',
      incidentals: 'Incidentals',
      corporate: 'Corporate',
      group: 'Group',
      mini_bar: 'Mini Bar',
      spa: 'Spa',
      restaurant: 'Restaurant',
    };
    return `${labels[type] || type}${isPrimary ? ' (Primary)' : ''}`;
  };

  const getVariant = (folioId: string, balance: number): "default" | "outline" | "secondary" | "destructive" => {
    if (folioId === currentFolioId) return 'default';
    if (balance > 0) return 'destructive';
    return 'outline';
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground mr-2">Folio:</span>
      {folios.map((folio) => (
        <button
          key={folio.id}
          onClick={() => onSwitch(folio.id)}
          className={cn(
            "transition-all",
            folio.id === currentFolioId && "ring-2 ring-primary ring-offset-2"
          )}
        >
          <Badge variant={getVariant(folio.id, folio.balance)} className="cursor-pointer hover:opacity-80">
            {getFolioLabel(folio.folio_type, folio.is_primary)}
            {folio.balance !== 0 && (
              <span className="ml-2 font-mono text-xs">
                ₦{Math.abs(folio.balance).toLocaleString()}
              </span>
            )}
          </Badge>
        </button>
      ))}
    </div>
  );
}
