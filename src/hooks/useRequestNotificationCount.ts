import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useRequestNotificationCount = () => {
  const [count, setCount] = useState(0);
  const { role, department } = useAuth();

  const fetchCount = async () => {
    if (!role || !department) return;

    let query = supabase
      .from('requests')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'in_progress']);

    // Filter based on role
    if (role === 'owner' || role === 'manager') {
      // Owners and managers see all requests
    } else if (role === 'frontdesk') {
      // Front desk sees all requests (global visibility)
    } else {
      // Department-specific staff see only their department's requests
      query = query.eq('assigned_department', department);
    }

    const { count: requestCount, error } = await query;

    if (!error && requestCount !== null) {
      setCount(requestCount);
    }
  };

  useEffect(() => {
    fetchCount();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('request-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests',
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, department]);

  return count;
};
