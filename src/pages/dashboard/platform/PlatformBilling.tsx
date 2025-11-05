import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, DollarSign, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PlatformBilling() {
  const [isRunningCycle, setIsRunningCycle] = useState(false);

  // Fetch billing records
  const { data: billingData, isLoading, refetch } = useQuery({
    queryKey: ['platform-billing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_billing')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Fetch tenant info separately (platform_tenants doesn't have 'name', using tenant_id)
      if (data && data.length > 0) {
        const tenantIds = [...new Set(data.map(b => b.tenant_id))];
        const { data: tenants } = await (supabase as any)
          .from('tenants')
          .select('id, name')
          .in('id', tenantIds);
        
        const tenantMap = new Map(tenants?.map((t: any) => [t.id, t.name]) || []);
        
        return data.map((invoice: any) => ({
          ...invoice,
          tenant_name: tenantMap.get(invoice.tenant_id) || 'Unknown',
        })) as any[];
      }
      
      return data || [];
    },
  });

  // Fetch billing summary
  const { data: summary } = useQuery({
    queryKey: ['platform-billing-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_billing')
        .select('amount_due, amount_paid, status');

      if (error) throw error;

      const total = data.reduce((acc, b) => acc + (b.amount_due || 0), 0);
      const paid = data.reduce((acc, b) => acc + (b.amount_paid || 0), 0);
      const pending = data.filter(b => b.status === 'pending').length;
      const overdue = data.filter(b => b.status === 'overdue').length;

      return { total, paid, pending, overdue, outstanding: total - paid };
    },
  });

  const runBillingCycle = async () => {
    setIsRunningCycle(true);
    try {
      const { data, error } = await supabase.functions.invoke('billing-cycle', {
        method: 'POST',
        body: {},
      });

      if (error) throw error;

      toast.success(`Billing cycle completed: ${data.processed} invoices generated`);
      refetch();
    } catch (error: any) {
      console.error('Billing cycle error:', error);
      toast.error('Failed to run billing cycle');
    } finally {
      setIsRunningCycle(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      paid: { variant: 'default', icon: CheckCircle2, className: 'bg-green-500' },
      pending: { variant: 'secondary', icon: FileText, className: 'bg-yellow-500' },
      overdue: { variant: 'destructive', icon: AlertTriangle, className: 'bg-red-500' },
      cancelled: { variant: 'outline', icon: null, className: '' },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={config.className}>
        {Icon && <Icon className="h-3 w-3 mr-1" />}
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Platform Billing</h1>
          <p className="text-muted-foreground">Manage invoices, billing cycles, and revenue</p>
        </div>
        <Button onClick={runBillingCycle} disabled={isRunningCycle}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRunningCycle ? 'animate-spin' : ''}`} />
          Run Billing Cycle
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{summary?.total.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">All-time billing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Paid</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{summary?.paid.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Successfully collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{summary?.outstanding.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">{summary?.pending || 0} pending invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.overdue || 0}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Billing Table */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Invoices</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Invoices</CardTitle>
              <CardDescription>Complete billing history</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Amount Due</TableHead>
                      <TableHead>Amount Paid</TableHead>
                      <TableHead>SMS Used</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingData?.map((invoice: any) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {invoice.tenant_name || 'Unknown Tenant'}
                        </TableCell>
                        <TableCell>
                          {new Date(invoice.cycle_start).toLocaleDateString()} - {new Date(invoice.cycle_end).toLocaleDateString()}
                        </TableCell>
                        <TableCell>₦{invoice.amount_due?.toLocaleString()}</TableCell>
                        <TableCell>₦{invoice.amount_paid?.toLocaleString()}</TableCell>
                        <TableCell>{invoice.sms_used || 0}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>{new Date(invoice.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {['pending', 'paid', 'overdue'].map((status) => (
          <TabsContent key={status} value={status}>
            <Card>
              <CardHeader>
                <CardTitle>{status.charAt(0).toUpperCase() + status.slice(1)} Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>SMS Used</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingData?.filter((i: any) => i.status === status).map((invoice: any) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {invoice.tenant_name || 'Unknown Tenant'}
                        </TableCell>
                        <TableCell>
                          {new Date(invoice.cycle_start).toLocaleDateString()} - {new Date(invoice.cycle_end).toLocaleDateString()}
                        </TableCell>
                        <TableCell>₦{invoice.amount_due?.toLocaleString()}</TableCell>
                        <TableCell>{invoice.sms_used || 0}</TableCell>
                        <TableCell>{new Date(invoice.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
