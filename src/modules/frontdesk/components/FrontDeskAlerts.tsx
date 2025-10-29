import { Bell, AlertTriangle, CreditCard, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFrontDeskAlerts } from '@/hooks/useFrontDeskAlerts';
import { Skeleton } from '@/components/ui/skeleton';

export function FrontDeskAlerts() {
  const { data, isLoading } = useFrontDeskAlerts();

  if (isLoading) {
    return <Skeleton className="w-10 h-10 rounded-full" />;
  }

  const totalAlerts = data?.totalAlerts || 0;
  const hasAlerts = totalAlerts > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {hasAlerts && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {totalAlerts > 9 ? '9+' : totalAlerts}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Front Desk Alerts</span>
          {hasAlerts && (
            <Badge variant="secondary">{totalAlerts} alert{totalAlerts !== 1 ? 's' : ''}</Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-96">
          <div className="space-y-4 p-2">
            {/* No alerts state */}
            {!hasAlerts && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No alerts</p>
                <p className="text-xs text-muted-foreground">All folios are settled</p>
              </div>
            )}

            {/* Unpaid Folios */}
            {data && data.unpaidFolios.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CreditCard className="h-4 w-4 text-destructive" />
                  <span>Unpaid Folios ({data.unpaidFolios.length})</span>
                </div>
                {data.unpaidFolios.map((folio) => (
                  <div 
                    key={folio.booking_id}
                    className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-1"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Room {folio.room_number}
                        </p>
                        <p className="text-xs text-muted-foreground">{folio.guest_name}</p>
                      </div>
                      <Badge variant="destructive">
                        ₦{folio.balance.toFixed(2)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Since: {new Date(folio.check_in).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Overpayments */}
            {data && data.overpayments.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span>Guest Overpayments ({data.overpayments.length})</span>
                </div>
                {data.overpayments.map((payment) => (
                  <div 
                    key={payment.wallet_id}
                    className="bg-warning/10 border border-warning/20 rounded-lg p-3 space-y-1"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {payment.guest_name}
                        </p>
                        <p className="text-xs text-muted-foreground">Excess wallet balance</p>
                      </div>
                      <Badge variant="outline" className="bg-warning/10">
                        ₦{payment.balance.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Organization Limit Warnings */}
            {data && data.orgLimitWarnings.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4 text-destructive" />
                  <span>Credit Limit Warnings ({data.orgLimitWarnings.length})</span>
                </div>
                {data.orgLimitWarnings.map((org) => (
                  <div 
                    key={org.organization_id}
                    className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {org.organization_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {org.percent_used.toFixed(0)}% of credit limit used
                        </p>
                      </div>
                      <Badge 
                        variant={org.percent_used >= 100 ? 'destructive' : 'outline'}
                        className={org.percent_used >= 100 ? '' : 'bg-warning/10'}
                      >
                        {org.percent_used >= 100 ? 'Over Limit' : 'Near Limit'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Balance:</span>
                      <span className="font-medium">₦{Math.abs(org.balance).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Limit:</span>
                      <span className="font-medium">₦{org.credit_limit.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
