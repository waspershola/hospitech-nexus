import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePlatformBilling } from '@/hooks/usePlatformBilling';
import { BillingOverviewCards } from '@/components/platform/BillingOverviewCards';
import { BillingInvoicesTable } from '@/components/platform/BillingInvoicesTable';
import { RefreshCw, Download } from 'lucide-react';
import { useState } from 'react';

export default function Billing() {
  const { invoices, usageRecords, summary, isLoading, syncUsage, markInvoicePaid, isSyncing } = usePlatformBilling();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const handleSyncUsage = () => {
    syncUsage.mutate(undefined);
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
          <h1 className="text-3xl font-bold">Billing & Revenue</h1>
          <p className="text-muted-foreground">
            Manage invoices and track platform revenue
          </p>
        </div>
        <Button onClick={handleSyncUsage} disabled={isSyncing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          Sync Usage
        </Button>
      </div>

      {summary && <BillingOverviewCards summary={summary} />}

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="usage">Usage Records</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Invoices</CardTitle>
              <CardDescription>
                View and manage platform invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BillingInvoicesTable
                invoices={invoices || []}
                onMarkPaid={(id) => markInvoicePaid.mutate(id)}
                onViewDetails={setSelectedInvoice}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage Records</CardTitle>
              <CardDescription>
                Detailed usage tracking for all tenants
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usageRecords && usageRecords.length > 0 ? (
                <div className="space-y-4">
                  {usageRecords.map((record: any) => (
                    <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{record.usage_type?.toUpperCase() || 'UNKNOWN'}</p>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {record.quantity} | Cost: ₦{Number(record.cost || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        {new Date(record.period_start).toLocaleDateString()} - {new Date(record.period_end).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No usage records found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
