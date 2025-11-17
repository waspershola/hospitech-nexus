import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStayFolio } from '@/hooks/useStayFolio';
import { formatCurrency } from '@/lib/finance/tax';
import { Receipt } from 'lucide-react';

interface RequestFolioLinkProps {
  request: any;
}

export function RequestFolioLink({ request }: RequestFolioLinkProps) {
  const { data: folio, isLoading } = useStayFolio(request.stay_folio_id);

  if (!request.stay_folio_id || isLoading) return null;
  if (!folio) return null;

  return (
    <Card className="mt-4 border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          Linked to Stay Folio
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          {folio.guest && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Guest:</span>
              <span className="font-medium">{folio.guest.name}</span>
            </div>
          )}
          {folio.room && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Room:</span>
              <span className="font-medium">{folio.room.number}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Charges:</span>
            <span className="font-medium">
              {formatCurrency(folio.total_charges, 'NGN')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Payments:</span>
            <span className="font-medium">
              {formatCurrency(folio.total_payments, 'NGN')}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t">
            <span className="text-muted-foreground">Balance:</span>
            <span
              className={`font-semibold ${
                folio.balance > 0
                  ? 'text-destructive'
                  : folio.balance < 0
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              {formatCurrency(folio.balance, 'NGN')}
            </span>
          </div>
          {request.metadata?.payment_choice && (
            <div className="flex justify-between pt-2 text-xs">
              <span className="text-muted-foreground">Payment:</span>
              <span className="font-medium capitalize">
                {request.metadata.payment_choice.replace('_', ' ')}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
