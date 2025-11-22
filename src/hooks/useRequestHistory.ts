import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RequestHistoryStats {
  totalRequests: number;
  completedRequests: number;
  averageResponseTime: number; // in minutes
  commonCategories: { category: string; count: number }[];
  recentRequests: Array<{
    id: string;
    type: string;
    status: string;
    created_at: string;
    completed_at: string | null;
  }>;
}

export function useRequestHistory(roomId: string | null, guestName: string | null) {
  const [stats, setStats] = useState<RequestHistoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { tenantId } = useAuth();

  useEffect(() => {
    if (!tenantId || (!roomId && !guestName)) {
      setStats(null);
      return;
    }

    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from('requests')
          .select('id, type, status, created_at, completed_at, metadata')
          .eq('tenant_id', tenantId)
          .not('qr_token', 'is', null)
          .order('created_at', { ascending: false });

        if (roomId) {
          query = query.eq('room_id', roomId);
        } else if (guestName) {
          query = query.contains('metadata', { guest_name: guestName });
        }

        const { data, error } = await query.limit(50);

        if (error) throw error;

        if (!data || data.length === 0) {
          setStats({
            totalRequests: 0,
            completedRequests: 0,
            averageResponseTime: 0,
            commonCategories: [],
            recentRequests: [],
          });
          return;
        }

        // Calculate stats
        const totalRequests = data.length;
        const completedRequests = data.filter(r => r.status === 'completed').length;

        // Calculate average response time for completed requests
        const responseTimes = data
          .filter(r => r.status === 'completed' && r.completed_at)
          .map(r => {
            const created = new Date(r.created_at).getTime();
            const completed = new Date(r.completed_at!).getTime();
            return (completed - created) / (1000 * 60); // minutes
          });

        const averageResponseTime = responseTimes.length > 0
          ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
          : 0;

        // Count categories
        const categoryCount = data.reduce((acc, r) => {
          acc[r.type] = (acc[r.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const commonCategories = Object.entries(categoryCount)
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

        setStats({
          totalRequests,
          completedRequests,
          averageResponseTime,
          commonCategories,
          recentRequests: data.slice(0, 5).map(r => ({
            id: r.id,
            type: r.type,
            status: r.status,
            created_at: r.created_at,
            completed_at: r.completed_at,
          })),
        });
      } catch (err) {
        console.error('[useRequestHistory] Error fetching history:', err);
        setStats(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [tenantId, roomId, guestName]);

  return { stats, isLoading };
}
