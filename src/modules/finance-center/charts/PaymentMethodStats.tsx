import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CreditCard } from 'lucide-react';

interface PaymentMethodStatsProps {
  data: Array<{
    method: string;
    count: number;
    total_amount: number;
  }>;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
];

export function PaymentMethodStats({ data }: PaymentMethodStatsProps) {
  const chartData = data.map((item, index) => ({
    name: item.method?.toUpperCase() || 'UNKNOWN',
    count: item.count,
    amount: item.total_amount,
    fill: COLORS[index % COLORS.length],
  }));

  const totalTransactions = data.reduce((sum, item) => sum + item.count, 0);
  const totalAmount = data.reduce((sum, item) => sum + item.total_amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          Payment Methods
        </CardTitle>
        <CardDescription>
          Distribution of payment methods by volume and count
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Total Transactions</p>
            <p className="text-2xl font-bold">{totalTransactions.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Volume</p>
            <p className="text-2xl font-bold text-primary">₦{totalAmount.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Bar Chart - Transaction Count */}
          <div>
            <h4 className="text-sm font-medium mb-4">By Transaction Count</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart - Volume */}
          <div>
            <h4 className="text-sm font-medium mb-4">By Volume (₦)</h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="amount"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                  }}
                  formatter={(value: number) => `₦${value.toLocaleString()}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
