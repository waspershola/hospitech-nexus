import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency } from '@/lib/finance/tax';
import { format } from 'date-fns';

// Extend jsPDF type
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
    autoTable: (options: any) => void;
  }
}

interface DateRange {
  start: Date;
  end: Date;
}

export function useFinanceReports(dateRange: DateRange) {
  const { tenantId } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  const { data: dailyRevenue } = useQuery({
    queryKey: ['daily-revenue', tenantId, dateRange],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('v_daily_revenue')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('report_date', format(dateRange.start, 'yyyy-MM-dd'))
        .lte('report_date', format(dateRange.end, 'yyyy-MM-dd'))
        .order('report_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId
  });

  const { data: departmentRevenue } = useQuery({
    queryKey: ['department-revenue', tenantId, dateRange],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('v_department_revenue')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('report_date', format(dateRange.start, 'yyyy-MM-dd'))
        .lte('report_date', format(dateRange.end, 'yyyy-MM-dd'))
        .order('revenue', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId
  });

  const { data: outstandingSummary } = useQuery({
    queryKey: ['outstanding-summary', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from('v_outstanding_summary')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId
  });

  const exportPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(20);
      doc.text('Financial Report', 14, 20);
      doc.setFontSize(10);
      doc.text(`Period: ${format(dateRange.start, 'MMM d, yyyy')} - ${format(dateRange.end, 'MMM d, yyyy')}`, 14, 28);

      // Daily Revenue Table
      if (dailyRevenue && dailyRevenue.length > 0) {
        doc.autoTable({
          startY: 35,
          head: [['Date', 'Payments', 'Revenue', 'Bookings', 'Guests']],
          body: dailyRevenue.map(row => [
            format(new Date(row.report_date), 'MMM d, yyyy'),
            row.payment_count,
            formatCurrency(row.total_revenue, 'NGN'),
            row.unique_bookings,
            row.unique_guests
          ]),
          theme: 'grid'
        });
      }

      // Department Revenue Table
      if (departmentRevenue && departmentRevenue.length > 0) {
        doc.autoTable({
          startY: doc.lastAutoTable.finalY + 10,
          head: [['Department', 'Revenue', 'Transactions']],
          body: departmentRevenue.map(row => [
            row.department,
            formatCurrency(row.revenue, 'NGN'),
            row.transaction_count
          ]),
          theme: 'grid'
        });
      }

      doc.save(`financial-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Export PDF failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportCSV = async () => {
    setIsExporting(true);
    try {
      if (!dailyRevenue) return;

      const headers = ['Date', 'Payments', 'Revenue', 'Bookings', 'Guests'];
      const rows = dailyRevenue.map(row => [
        format(new Date(row.report_date), 'yyyy-MM-dd'),
        row.payment_count,
        row.total_revenue,
        row.unique_bookings,
        row.unique_guests
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export CSV failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return {
    dailyRevenue,
    departmentRevenue,
    outstandingSummary,
    exportPDF,
    exportCSV,
    isExporting
  };
}
