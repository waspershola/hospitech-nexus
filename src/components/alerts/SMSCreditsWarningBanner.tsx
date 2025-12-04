import { useState } from 'react';
import { AlertTriangle, X, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function SMSCreditsWarningBanner() {
  const { tenantId } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  // Fetch SMS credits from the correct table (platform_sms_credit_pool)
  const { data: credits, isLoading } = useQuery({
    queryKey: ['sms-credit-pool', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from('platform_sms_credit_pool')
        .select('total_credits, consumed_credits')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching SMS credits:', error);
        return null;
      }
      return data;
    },
    enabled: !!tenantId,
    staleTime: 30000, // 30 seconds
  });

  if (isLoading || dismissed || !credits) return null;

  const total = credits.total_credits ?? 0;
  const consumed = credits.consumed_credits ?? 0;
  const available = total - consumed;
  const usagePercent = total > 0 ? (consumed / total) * 100 : 0;

  // Show warning when credits are depleted or critically low (< 20% remaining)
  const isDepleted = available <= 0 && total > 0;
  const isCriticallyLow = available > 0 && usagePercent >= 80;

  if (!isDepleted && !isCriticallyLow) return null;

  return (
    <div
      className={`relative flex items-center justify-between gap-4 px-4 py-3 text-sm ${
        isDepleted
          ? 'bg-destructive text-destructive-foreground'
          : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-b border-amber-500/20'
      }`}
    >
      <div className="flex items-center gap-3">
        {isDepleted ? (
          <AlertTriangle className="h-5 w-5 shrink-0" />
        ) : (
          <MessageSquare className="h-5 w-5 shrink-0" />
        )}
        <div>
          <span className="font-medium">
            {isDepleted ? 'SMS Credits Depleted!' : 'Low SMS Credits Warning'}
          </span>
          <span className="ml-2 opacity-90">
            {isDepleted
              ? 'Your SMS service is paused. Purchase credits to resume sending messages.'
              : `Only ${available} credits remaining. Consider purchasing more to avoid service interruption.`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant={isDepleted ? 'secondary' : 'outline'}
          onClick={() => navigate('/dashboard/marketplace')}
          className="h-7 text-xs"
        >
          Purchase Credits
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
