import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/finance/tax";
import { ExternalLink, User, Hotel, CreditCard, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { GroupChildFolio } from "@/hooks/useGroupMasterFolio";

interface GroupChildFolioCardProps {
  folio: GroupChildFolio;
  masterFolioId: string;
}

export function GroupChildFolioCard({ folio }: GroupChildFolioCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{folio.folio_number}</CardTitle>
          <Badge variant={folio.status === 'open' ? 'default' : 'secondary'}>
            {folio.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Guest Info */}
        <div className="flex items-start gap-2">
          <User className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{folio.guest?.name}</p>
            {folio.guest?.email && (
              <p className="text-xs text-muted-foreground truncate">{folio.guest.email}</p>
            )}
          </div>
        </div>

        {/* Room Info */}
        {folio.room && (
          <div className="flex items-center gap-2">
            <Hotel className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Room {folio.room.number}</span>
          </div>
        )}

        {/* Financial Summary */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5" />
              <span>Charges</span>
            </div>
            <span className="font-medium">{formatCurrency(folio.total_charges, 'NGN')}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              <span>Payments</span>
            </div>
            <span className="font-medium text-green-600">
              {formatCurrency(folio.total_payments, 'NGN')}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm pt-2 border-t">
            <span className="font-medium">Balance</span>
            <span className={`font-bold ${
              folio.balance > 0 ? 'text-destructive' : 'text-green-600'
            }`}>
              {formatCurrency(folio.balance, 'NGN')}
            </span>
          </div>
        </div>

        {/* View Details Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2"
          onClick={() => navigate(`/dashboard/billing/${folio.id}`)}
        >
          <ExternalLink className="mr-2 h-3.5 w-3.5" />
          View Folio
        </Button>
      </CardContent>
    </Card>
  );
}
