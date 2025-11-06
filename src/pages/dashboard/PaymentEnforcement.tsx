import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePaymentEnforcement } from '@/hooks/usePaymentEnforcement';
import { PaymentEnforcementCard } from '@/components/platform/PaymentEnforcementCard';
import { AlertTriangle, Ban, DollarSign, Play, RefreshCw } from 'lucide-react';

export default function PaymentEnforcement() {
  const { 
    overdueInvoices, 
    isLoading, 
    stats, 
    runEnforcement, 
    reactivateTenant,
    isRunning 
  } = usePaymentEnforcement();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Enforcement</h1>
          <p className="text-muted-foreground">
            Automated reminders and suspension management
          </p>
        </div>
        <Button
          onClick={() => runEnforcement.mutate()}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Run Enforcement
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOverdue}</div>
            <p className="text-xs text-muted-foreground">
              Requiring follow-up
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended Tenants</CardTitle>
            <Ban className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.suspendedTenants}</div>
            <p className="text-xs text-muted-foreground">
              Payment required to reactivate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalOverdueAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Across all overdue invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Cases</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.criticalCount}</div>
            <p className="text-xs text-muted-foreground">
              7+ days overdue
            </p>
          </CardContent>
        </Card>
      </div>

      <PaymentEnforcementCard
        overdueInvoices={(overdueInvoices || []) as any}
        onReactivate={(tenantId, invoiceId) => reactivateTenant.mutate({ tenantId, invoiceId })}
      />

      <Card>
        <CardHeader>
          <CardTitle>Automated Enforcement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span>Enforcement runs automatically daily at 9:00 AM</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span>Email reminders sent at 1, 3, and 7 days overdue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-destructive" />
              <span>Automatic suspension after 14 days overdue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success" />
              <span>Tenants automatically reactivated upon payment</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
