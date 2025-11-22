import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRingtone } from './useRingtone';

/**
 * PHASE-3: SLA Tracking & Overdue Alerts
 * Hook to detect and alert on overdue QR requests based on tenant SLA configuration
 * 
 * Features:
 * - Fetches tenant SLA threshold from hotel_configurations
 * - Counts pending/in_progress requests older than SLA
 * - Plays ringtone alert every 5 minutes if overdue requests exist
 * - Returns overdue count and SLA minutes for UI display
 */
export function useOverdueRequests() {
  const { tenantId } = useAuth();
  const { playRingtone, permissionGranted } = useRingtone();
  const [overdueCount, setOverdueCount] = useState(0);
  const [slaMinutes, setSlaMinutes] = useState(15);

  const fetchOverdue = async () => {
    if (!tenantId) return;

    try {
      // Get SLA config from hotel_configurations
      const { data: config } = await supabase
        .from('hotel_configurations')
        .select('value')
        .eq('tenant_id', tenantId)
        .eq('key', 'request_sla_minutes')
        .single();

      const sla = config?.value ? parseInt(config.value as string) : 15;
      setSlaMinutes(sla);

      // Calculate overdue threshold
      const overdueThreshold = new Date();
      overdueThreshold.setMinutes(overdueThreshold.getMinutes() - sla);

      // Count overdue requests (pending/in_progress, not yet responded, older than SLA)
      const { count } = await supabase
        .from('requests')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('status', ['pending', 'in_progress'])
        .is('responded_at', null) // Not yet responded
        .lt('created_at', overdueThreshold.toISOString());

      setOverdueCount(count || 0);

      // Play alert ringtone if overdue requests exist
      if (count && count > 0 && permissionGranted) {
        console.log(`[useOverdueRequests] PHASE-3: ${count} overdue requests detected, playing alert`);
        playRingtone('/sounds/notification-default.mp3', { loop: false });
      }
    } catch (error) {
      console.error('[useOverdueRequests] Error fetching overdue count:', error);
    }
  };

  useEffect(() => {
    if (!tenantId) return;

    // Initial fetch
    fetchOverdue();

    // Check every 5 minutes for overdue requests
    const interval = setInterval(fetchOverdue, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [tenantId, permissionGranted]);

  // PHASE-3: Helper functions for calculating overdue status per request
  const calculateOverdue = (request: any): { isOverdue: boolean; minutesOverdue: number } => {
    if (request.status !== 'pending') {
      return { isOverdue: false, minutesOverdue: 0 };
    }

    const createdAt = new Date(request.created_at);
    const now = new Date();
    const minutesElapsed = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
    const minutesOverdue = minutesElapsed - slaMinutes;

    return {
      isOverdue: minutesOverdue > 0,
      minutesOverdue: Math.max(0, minutesOverdue),
    };
  };

  const getOverdueRequests = (requests: any[]) => {
    return requests.filter(request => calculateOverdue(request).isOverdue);
  };

  return { overdueCount, slaMinutes, calculateOverdue, getOverdueRequests };
}
