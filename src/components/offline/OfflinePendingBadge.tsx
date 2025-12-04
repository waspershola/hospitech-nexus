/**
 * Offline Pending Badge - Phase 9
 * Displays badge for pending offline charges/payments
 * Only visible in Electron mode
 */

import { Badge } from '@/components/ui/badge';
import { isElectronContext } from '@/lib/offline/electronFolioBridge';

interface OfflinePendingBadgeProps {
  type: 'charge' | 'payment' | 'transaction';
  count: number;
  className?: string;
}

export function OfflinePendingBadge({ type, count, className = '' }: OfflinePendingBadgeProps) {
  // Only show in Electron mode with pending items
  if (!isElectronContext() || count === 0) {
    return null;
  }

  const labels: Record<string, string> = {
    charge: 'Offline Charges',
    payment: 'Offline Payments',
    transaction: 'Offline Transactions',
  };

  return (
    <Badge 
      variant="outline" 
      className={`text-amber-600 border-amber-500 bg-amber-50 dark:bg-amber-950/30 ${className}`}
    >
      {count} {labels[type]}
    </Badge>
  );
}

interface OfflineBalanceBadgeProps {
  balance: number;
  className?: string;
}

export function OfflineBalanceBadge({ balance, className = '' }: OfflineBalanceBadgeProps) {
  // Only show in Electron mode
  if (!isElectronContext()) {
    return null;
  }

  const isPositive = balance > 0;

  return (
    <Badge 
      variant="outline" 
      className={`${isPositive ? 'text-red-600 border-red-500' : 'text-green-600 border-green-500'} ${className}`}
    >
      Offline Balance: ₦{Math.abs(balance).toLocaleString()}
    </Badge>
  );
}
