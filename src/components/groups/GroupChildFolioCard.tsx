import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/finance/tax";
import { formatFolioMoney, getBalanceColor, getCreditLabel, isCredit, getFolioStatusVariant } from "@/lib/folio/formatters";
import { ExternalLink, User, Hotel, CreditCard, DollarSign, Info } from "lucide-react";
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
          <div className="flex items-center gap-2">
            {isCredit(folio.balance) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Credit Folio
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">This folio has been overpaid</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Badge variant={getFolioStatusVariant(folio.status)}>
              {folio.status}
            </Badge>
          </div>
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
            <span className="font-medium">{formatFolioMoney(folio.total_charges, 'NGN')}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              <span>Payments</span>
            </div>
            <span className="font-medium text-green-600">
              {formatFolioMoney(folio.total_payments, 'NGN')}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm pt-2 border-t">
            <span className="font-medium">Balance</span>
            <span className={`font-bold ${getBalanceColor(folio.balance)}`}>
              {isCredit(folio.balance) 
                ? getCreditLabel(folio.balance, 'NGN')
                : formatFolioMoney(folio.balance, 'NGN')
              }
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
