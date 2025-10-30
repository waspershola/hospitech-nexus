import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Wallet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useOrganizationWallet } from '@/hooks/useOrganizationWallet';

interface OrganizationWalletStatusProps {
  organizationId: string;
  requiredAmount?: number;
}

export function OrganizationWalletStatus({ 
  organizationId, 
  requiredAmount 
}: OrganizationWalletStatusProps) {
  const { data: wallet } = useOrganizationWallet(organizationId);

  if (!wallet) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No wallet found for this organization. Bookings cannot be created until a wallet is set up.
        </AlertDescription>
      </Alert>
    );
  }

  const hasCapacity = requiredAmount 
    ? (wallet.allow_negative_balance || wallet.balance >= requiredAmount)
    : true;

  return (
    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          Organization Wallet
        </span>
        <Badge variant={wallet.balance >= 0 ? 'default' : 'destructive'}>
          ₦{Math.abs(wallet.balance).toLocaleString()} {wallet.balance < 0 && 'DR'}
        </Badge>
      </div>
      
      <div className="text-sm text-muted-foreground">
        Credit Limit: ₦{wallet.credit_limit.toLocaleString()}
      </div>
      
      {requiredAmount && (
        <div className="flex items-center gap-2 text-sm">
          {hasCapacity ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-green-600">Sufficient credit available</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-destructive">Insufficient credit</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
