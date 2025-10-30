import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { differenceInDays } from 'date-fns';

export function ReceivablesAgingChart() {
  const { tenantId } = useAuth();

  const { data: chartData } = useQuery({
    queryKey: ['receivables-aging', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data } = await supabase
        .from('receivables')
        .select('amount, created_at')
        .eq('tenant_id', tenantId)
        .eq('status', 'open');
      
      // Group by age buckets
      const buckets = {
        '0-7 days': 0,
        '8-30 days': 0,
        '31-60 days': 0,
        '60+ days': 0,
      };
      
      data?.forEach(r => {
        const age = differenceInDays(new Date(), new Date(r.created_at));
        const amount = Number(r.amount);
        
        if (age <= 7) buckets['0-7 days'] += amount;
        else if (age <= 30) buckets['8-30 days'] += amount;
        else if (age <= 60) buckets['31-60 days'] += amount;
        else buckets['60+ days'] += amount;
      });
      
      return Object.entries(buckets).map(([name, value]) => ({ 
        name, 
        value,
        label: `₦${value.toLocaleString()}`,
      }));
    },
    enabled: !!tenantId,
  });

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">AR Aging Analysis</h3>
          <p className="text-sm text-muted-foreground">Outstanding receivables by age bucket</p>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`} />
            <Tooltip 
              formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Amount']}
            />
            <Legend />
            <Bar 
              dataKey="value" 
              fill="hsl(var(--destructive))" 
              name="Outstanding Amount"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}