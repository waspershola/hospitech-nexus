import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

interface RevenueByTenant {
  tenant_id: string;
  tenant_name: string;
  total_revenue: number;
  booking_revenue: number;
  qr_revenue: number;
  transaction_count: number;
}

interface RevenueByType {
  type: 'booking' | 'qr_payment';
  revenue: number;
  count: number;
}

interface MonthlyRevenue {
  month: string;
  booking_revenue: number;
  qr_revenue: number;
  total_revenue: number;
}

interface PlatformFeeRevenueData {
  totalRevenue: number;
  bookingRevenue: number;
  qrRevenue: number;
  totalTransactions: number;
  revenueByTenant: RevenueByTenant[];
  revenueByType: RevenueByType[];
  monthlyTrends: MonthlyRevenue[];
}

export function usePlatformFeeRevenue(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ['platform-fee-revenue', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      // Default to last 6 months if no dates provided
      const end = endDate || new Date();
      const start = startDate || subMonths(end, 5);

      // Fetch all fee ledger entries with tenant info
      let query = supabase
        .from('platform_fee_ledger')
        .select(`
          *,
          tenant:tenants!platform_fee_ledger_tenant_id_fkey(id, name)
        `)
        .in('status', ['billed', 'paid', 'settled']);

      if (startDate) {
        query = query.gte('created_at', start.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', end.toISOString());
      }

      const { data: ledgerEntries, error } = await query;

      if (error) {
        console.error('Error fetching platform fee revenue:', error);
        throw error;
      }

      if (!ledgerEntries || ledgerEntries.length === 0) {
        return {
          totalRevenue: 0,
          bookingRevenue: 0,
          qrRevenue: 0,
          totalTransactions: 0,
          revenueByTenant: [],
          revenueByType: [],
          monthlyTrends: [],
        };
      }

      // Calculate total revenue
      const totalRevenue = ledgerEntries.reduce((sum, entry) => sum + Number(entry.fee_amount), 0);
      const bookingRevenue = ledgerEntries
        .filter(e => e.reference_type === 'booking')
        .reduce((sum, entry) => sum + Number(entry.fee_amount), 0);
      const qrRevenue = ledgerEntries
        .filter(e => ['qr_payment', 'qr_request'].includes(e.reference_type))
        .reduce((sum, entry) => sum + Number(entry.fee_amount), 0);

      // Revenue by tenant
      const tenantMap = new Map<string, RevenueByTenant>();
      ledgerEntries.forEach(entry => {
        const tenantId = entry.tenant_id;
        const tenantName = (entry.tenant as any)?.name || 'Unknown';
        const feeAmount = Number(entry.fee_amount);
        
        if (!tenantMap.has(tenantId)) {
          tenantMap.set(tenantId, {
            tenant_id: tenantId,
            tenant_name: tenantName,
            total_revenue: 0,
            booking_revenue: 0,
            qr_revenue: 0,
            transaction_count: 0,
          });
        }

        const tenant = tenantMap.get(tenantId)!;
        tenant.total_revenue += feeAmount;
        tenant.transaction_count += 1;

        if (entry.reference_type === 'booking') {
          tenant.booking_revenue += feeAmount;
        } else if (['qr_payment', 'qr_request'].includes(entry.reference_type)) {
          tenant.qr_revenue += feeAmount;
        }
      });

      const revenueByTenant = Array.from(tenantMap.values())
        .sort((a, b) => b.total_revenue - a.total_revenue);

      // Revenue by type
      const revenueByType: RevenueByType[] = [
        {
          type: 'booking',
          revenue: bookingRevenue,
          count: ledgerEntries.filter(e => e.reference_type === 'booking').length,
        },
        {
          type: 'qr_payment',
          revenue: qrRevenue,
          count: ledgerEntries.filter(e => ['qr_payment', 'qr_request'].includes(e.reference_type)).length,
        },
      ];

      // Monthly trends
      const monthlyMap = new Map<string, MonthlyRevenue>();
      ledgerEntries.forEach(entry => {
        const month = format(new Date(entry.created_at), 'MMM yyyy');
        const feeAmount = Number(entry.fee_amount);

        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, {
            month,
            booking_revenue: 0,
            qr_revenue: 0,
            total_revenue: 0,
          });
        }

        const monthData = monthlyMap.get(month)!;
        monthData.total_revenue += feeAmount;

        if (entry.reference_type === 'booking') {
          monthData.booking_revenue += feeAmount;
        } else if (['qr_payment', 'qr_request'].includes(entry.reference_type)) {
          monthData.qr_revenue += feeAmount;
        }
      });

      const monthlyTrends = Array.from(monthlyMap.values())
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

      return {
        totalRevenue,
        bookingRevenue,
        qrRevenue,
        totalTransactions: ledgerEntries.length,
        revenueByTenant,
        revenueByType,
        monthlyTrends,
      } as PlatformFeeRevenueData;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
