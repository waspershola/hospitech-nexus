import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

interface SMSUsageRecord {
  date: string;
  count: number;
  cost: number;
}

export function useSMSUsageTracking() {
  const { user } = useAuth();

  const { data: usageHistory, isLoading } = useQuery({
    queryKey: ['sms-usage-history', user?.id],
    queryFn: async () => {
      // Get user's tenant
      const userRoleUrl = `https://akchmpmzcupzjaeewdui.supabase.co/rest/v1/user_roles?user_id=eq.${user?.id}&select=tenant_id`;
      const userRoleResponse = await fetch(userRoleUrl, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrY2htcG16Y3VwemphZWV3ZHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NTg0MTMsImV4cCI6MjA3NzIzNDQxM30.BqjNXhwKlNAAjRT0b7c86fkPe2htu19duz25kuCtEg4',
        },
      });

      const userRoles = await userRoleResponse.json();
      const userRole = userRoles[0];

      if (!userRole?.tenant_id) return [];

      // Get SMS usage from guest_communications (SMS messages)
      const smsUrl = `https://akchmpmzcupzjaeewdui.supabase.co/rest/v1/guest_communications?tenant_id=eq.${userRole.tenant_id}&type=eq.sms&select=created_at&order=created_at.desc&limit=1000`;
      const smsResponse = await fetch(smsUrl, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrY2htcG16Y3VwemphZWV3ZHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NTg0MTMsImV4cCI6MjA3NzIzNDQxM30.BqjNXhwKlNAAjRT0b7c86fkPe2htu19duz25kuCtEg4',
        },
      });

      const smsRecords = await smsResponse.json();

      // Group by date
      const usageByDate: Record<string, SMSUsageRecord> = {};
      
      smsRecords.forEach((record: any) => {
        const date = new Date(record.created_at).toISOString().split('T')[0];
        if (!usageByDate[date]) {
          usageByDate[date] = {
            date,
            count: 0,
            cost: 0,
          };
        }
        usageByDate[date].count += 1;
        usageByDate[date].cost += 1; // 1 credit per SMS
      });

      // Convert to array and sort by date
      return Object.values(usageByDate).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    },
    enabled: !!user?.id,
  });

  const totalSentLast30Days = usageHistory?.slice(0, 30).reduce((sum, record) => sum + record.count, 0) || 0;
  const totalCostLast30Days = usageHistory?.slice(0, 30).reduce((sum, record) => sum + record.cost, 0) || 0;

  return {
    usageHistory: usageHistory || [],
    totalSentLast30Days,
    totalCostLast30Days,
    isLoading,
  };
}
