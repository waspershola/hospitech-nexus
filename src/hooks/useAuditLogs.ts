import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AuditLogFilters {
  user_id?: string;
  room_id?: string;
  booking_id?: string;
  action?: string;
  table_name?: string;
  start_date?: Date;
  end_date?: Date;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  before_data: any;
  after_data: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  };
}

export function useAuditLogs(filters: AuditLogFilters = {}, page = 1, pageSize = 50) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['audit-logs', tenantId, filters, page, pageSize],
    queryFn: async () => {
      if (!tenantId) return { logs: [], total: 0 };

      // Build query with filters
      let query = supabase
        .from('hotel_audit_logs')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters.action) {
        query = query.eq('action', filters.action);
      }
      if (filters.table_name) {
        query = query.eq('table_name', filters.table_name);
      }
      if (filters.room_id) {
        query = query.eq('record_id', filters.room_id);
      }
      if (filters.booking_id) {
        query = query.eq('record_id', filters.booking_id);
      }
      if (filters.start_date) {
        query = query.gte('created_at', filters.start_date.toISOString());
      }
      if (filters.end_date) {
        query = query.lte('created_at', filters.end_date.toISOString());
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Fetch user profiles for the logs
      const userIds = [...new Set(data?.map(log => log.user_id).filter(Boolean))] as string[];
      let profiles: Record<string, { full_name: string; email: string }> = {};

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        profiles = Object.fromEntries(
          (profilesData || []).map(p => [p.id, { full_name: p.full_name || '', email: p.email || '' }])
        );
      }

      // Merge user data into logs
      const logsWithUsers = (data || []).map(log => ({
        ...log,
        user: log.user_id ? profiles[log.user_id] : undefined,
      }));

      return {
        logs: logsWithUsers as AuditLog[],
        total: count || 0,
      };
    },
    enabled: !!tenantId,
  });
}

// Get unique actions for filter dropdown
export function useAuditActions() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['audit-actions', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('hotel_audit_logs')
        .select('action')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Get unique actions
      const actions = [...new Set(data.map(row => row.action))].sort();
      return actions;
    },
    enabled: !!tenantId,
  });
}

// Get unique tables for filter dropdown
export function useAuditTables() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['audit-tables', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('hotel_audit_logs')
        .select('table_name')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Get unique tables
      const tables = [...new Set(data.map(row => row.table_name))].sort();
      return tables;
    },
    enabled: !!tenantId,
  });
}
