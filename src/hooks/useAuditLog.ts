import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AuditLogEntry {
  action: string;
  table_name: string;
  record_id?: string;
  before_data?: Record<string, any>;
  after_data?: Record<string, any>;
}

export function useAuditLog() {
  const { tenantId, user } = useAuth();

  const logMutation = useMutation({
    mutationFn: async (entry: AuditLogEntry) => {
      if (!tenantId || !user) return;

      const { error } = await supabase
        .from('hotel_audit_logs')
        .insert([{
          tenant_id: tenantId,
          user_id: user.id,
          action: entry.action,
          table_name: entry.table_name,
          record_id: entry.record_id,
          before_data: entry.before_data,
          after_data: entry.after_data,
        }]);

      if (error) throw error;
    },
  });

  const logAction = (entry: AuditLogEntry) => {
    logMutation.mutate(entry);
  };

  return { logAction };
}
