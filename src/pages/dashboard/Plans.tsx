import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePlansManagement } from '@/hooks/usePlansManagement';
import { PlansGrid } from '@/components/platform/PlansGrid';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export default function Plans() {
  const { plans, subscriptions, isLoading } = usePlansManagement();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      trial: 'secondary',
      active: 'default',
      past_due: 'destructive',
      cancelled: 'outline',
      expired: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Badge>
    );
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
          <h1 className="text-3xl font-bold">Plans & Subscriptions</h1>
          <p className="text-muted-foreground">
            Manage pricing plans and tenant subscriptions
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Plan
        </Button>
      </div>

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans">All Plans</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          <PlansGrid
            plans={(plans || []) as any}
            onEditPlan={setSelectedPlan}
            showActions={true}
          />
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Subscriptions</CardTitle>
              <CardDescription>
                View and manage tenant subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!subscriptions || subscriptions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No subscriptions found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Billing Cycle</TableHead>
                      <TableHead>Trial Ends</TableHead>
                      <TableHead>Period Ends</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((sub: any) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">
                          {sub.tenants?.name || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {sub.platform_plans?.name || 'No Plan'}
                        </TableCell>
                        <TableCell>{getStatusBadge(sub.status)}</TableCell>
                        <TableCell className="capitalize">{sub.billing_cycle}</TableCell>
                        <TableCell className="text-sm">
                          {sub.trial_end ? format(new Date(sub.trial_end), 'MMM dd, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(sub.current_period_end), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline">
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
