import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface QRAnalytics {
  totalScans: number;
  totalRequests: number;
  avgResponseTime: number; // in minutes
  activeQRCodes: number;
  requestsByService: Array<{ service: string; count: number }>;
  requestsByStatus: Array<{ status: string; count: number }>;
  requestsByPriority: Array<{ priority: string; count: number }>;
  dailyTrends: Array<{ date: string; scans: number; requests: number }>;
  topServices: Array<{ service: string; count: number; avgResponseTime: number }>;
}

export function useQRAnalytics(dateRange?: { from: Date; to: Date }) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['qr-analytics', tenantId, dateRange],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant ID');

      const fromDate = dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = dateRange?.to || new Date();

      // Fetch QR codes
      const { data: qrCodes, error: qrError } = await supabase
        .from('qr_codes')
        .select('id, status, created_at')
        .eq('tenant_id', tenantId);

      if (qrError) throw qrError;

      // Fetch requests
      const { data: requests, error: requestsError } = await supabase
        .from('requests')
        .select('id, service_category, status, priority, created_at, completed_at, metadata')
        .eq('tenant_id', tenantId)
        .gte('created_at', fromDate.toISOString())
        .lte('created_at', toDate.toISOString())
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Calculate metrics
      const totalScans = 0; // Placeholder - scans not tracked yet
      const totalRequests = requests?.length || 0;
      const activeQRCodes = qrCodes?.filter(qr => qr.status === 'active').length || 0;

      // Calculate average response time
      const completedRequests = requests?.filter(r => r.status === 'completed' && r.completed_at) || [];
      const responseTimes = completedRequests.map(r => {
        const created = new Date(r.created_at).getTime();
        const completed = new Date(r.completed_at!).getTime();
        return (completed - created) / (1000 * 60); // minutes
      });
      const avgResponseTime = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
        : 0;

      // Group by service category
      const serviceMap = new Map<string, number>();
      requests?.forEach(r => {
        const service = r.service_category || 'other';
        serviceMap.set(service, (serviceMap.get(service) || 0) + 1);
      });
      const requestsByService = Array.from(serviceMap.entries())
        .map(([service, count]) => ({ service, count }))
        .sort((a, b) => b.count - a.count);

      // Group by status
      const statusMap = new Map<string, number>();
      requests?.forEach(r => {
        const status = r.status || 'pending';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });
      const requestsByStatus = Array.from(statusMap.entries())
        .map(([status, count]) => ({ status, count }));

      // Group by priority
      const priorityMap = new Map<string, number>();
      requests?.forEach(r => {
        const priority = r.priority || 'normal';
        priorityMap.set(priority, (priorityMap.get(priority) || 0) + 1);
      });
      const requestsByPriority = Array.from(priorityMap.entries())
        .map(([priority, count]) => ({ priority, count }));

      // Daily trends
      const dailyMap = new Map<string, { scans: number; requests: number }>();
      const dateFormatter = new Intl.DateTimeFormat('en-CA'); // YYYY-MM-DD format
      
      requests?.forEach(r => {
        const date = dateFormatter.format(new Date(r.created_at));
        const current = dailyMap.get(date) || { scans: 0, requests: 0 };
        dailyMap.set(date, { ...current, requests: current.requests + 1 });
      });

      const dailyTrends = Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14); // Last 14 days

      // Top services with avg response time
      const serviceResponseMap = new Map<string, { count: number; totalTime: number }>();
      completedRequests.forEach(r => {
        const service = r.service_category || 'other';
        const created = new Date(r.created_at).getTime();
        const completed = new Date(r.completed_at!).getTime();
        const responseTime = (completed - created) / (1000 * 60); // minutes
        
        const current = serviceResponseMap.get(service) || { count: 0, totalTime: 0 };
        serviceResponseMap.set(service, {
          count: current.count + 1,
          totalTime: current.totalTime + responseTime,
        });
      });

      const topServices = Array.from(serviceResponseMap.entries())
        .map(([service, data]) => ({
          service,
          count: data.count,
          avgResponseTime: Math.round(data.totalTime / data.count),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const analytics: QRAnalytics = {
        totalScans,
        totalRequests,
        avgResponseTime,
        activeQRCodes,
        requestsByService,
        requestsByStatus,
        requestsByPriority,
        dailyTrends,
        topServices,
      };

      return analytics;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
