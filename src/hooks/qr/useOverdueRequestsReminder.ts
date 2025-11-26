import { useEffect, useRef } from 'react';
import { useStaffRequests } from '@/hooks/useStaffRequests';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * PHASE-2-SLA-REMINDER: 5-minute overdue request reminder
 * Plays ringtone every 5 minutes when overdue pending requests exist
 */
export function useOverdueRequestsReminder(tenantId: string) {
  const { data: config } = useQuery({
    queryKey: ['hotel-config', tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('hotel_configurations')
        .select('value')
        .eq('tenant_id', tenantId)
        .eq('key', 'sla_threshold_minutes')
        .maybeSingle();
      
      return data?.value as number | null;
    },
    enabled: !!tenantId,
  });
  
  const { requests } = useStaffRequests();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const slaMinutes = config || 30;

  useEffect(() => {
    // Initialize audio element
    if (!audioRef.current) {
      audioRef.current = new Audio('/sounds/notification-default.mp3');
      audioRef.current.volume = 0.5;
    }

    // Calculate overdue requests
    const overdueRequests = (requests || []).filter(request => {
      if (request.status !== 'pending') return false;
      
      const createdAt = new Date(request.created_at);
      const minutesElapsed = Math.floor((Date.now() - createdAt.getTime()) / 1000 / 60);
      
      return minutesElapsed > slaMinutes;
    });

    const hasOverdueRequests = overdueRequests.length > 0;

    console.log('[PHASE-2-SLA-REMINDER] Overdue check:', {
      total: requests?.length || 0,
      overdue: overdueRequests.length,
      slaMinutes,
      hasOverdueRequests
    });

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Set up 5-minute reminder if overdue requests exist
    if (hasOverdueRequests) {
      // Play immediately
      audioRef.current?.play().catch(err => {
        console.warn('[PHASE-2-SLA-REMINDER] Audio play failed:', err);
      });

      // Then every 5 minutes
      intervalRef.current = setInterval(() => {
        console.log('[PHASE-2-SLA-REMINDER] Playing 5-minute reminder');
        audioRef.current?.play().catch(err => {
          console.warn('[PHASE-2-SLA-REMINDER] Audio play failed:', err);
        });
      }, 5 * 60 * 1000); // 5 minutes
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [requests, slaMinutes]);

  return {
    isActive: !!intervalRef.current,
  };
}
