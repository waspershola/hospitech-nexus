import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePlatformFeeAlerts } from '@/hooks/usePlatformFeeAlerts';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle2, Info, Bell, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertRulesManager } from './AlertRulesManager';

export function PlatformFeeAlertsTab() {
  const { alerts, unacknowledgedCount, acknowledgeAlert, triggerCheck } = usePlatformFeeAlerts();

  if (alerts.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const severityConfig = {
    critical: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
    warning: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50' },
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unacknowledged Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unacknowledgedCount.data || 0}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alerts.data?.filter(a => a.severity === 'critical' && !a.acknowledged).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Immediate action needed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts (24h)</CardTitle>
            <Info className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alerts.data?.filter(a => {
                const alertDate = new Date(a.created_at);
                const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                return alertDate > dayAgo;
              }).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="alerts" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
            <TabsTrigger value="rules">Alert Rules</TabsTrigger>
          </TabsList>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerCheck.mutate()}
            disabled={triggerCheck.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${triggerCheck.isPending ? 'animate-spin' : ''}`} />
            Run Check Now
          </Button>
        </div>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Alerts</CardTitle>
              <CardDescription>
                Automated alerts for revenue drops and unusual patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!alerts.data || alerts.data.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No alerts generated yet</p>
                  <p className="text-sm mt-2">Alerts will appear when revenue thresholds are breached</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Severity</TableHead>
                      <TableHead>Alert</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Current Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.data.map((alert) => {
                      const SeverityIcon = severityConfig[alert.severity].icon;
                      return (
                        <TableRow key={alert.id} className={alert.acknowledged ? 'opacity-50' : ''}>
                          <TableCell>
                            <div className={`flex items-center gap-2 ${severityConfig[alert.severity].color}`}>
                              <SeverityIcon className="h-4 w-4" />
                              <span className="capitalize">{alert.severity}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{alert.title}</div>
                              <div className="text-sm text-muted-foreground">{alert.message}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {alert.tenant ? alert.tenant.name : 'All Tenants'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(alert.period_start), 'MMM d')} - {format(new Date(alert.period_end), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="font-mono">
                            ₦{alert.current_value.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {alert.acknowledged ? (
                              <Badge variant="secondary" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Acknowledged
                              </Badge>
                            ) : (
                              <Badge variant="destructive">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {!alert.acknowledged && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => acknowledgeAlert.mutate(alert.id)}
                                disabled={acknowledgeAlert.isPending}
                              >
                                Acknowledge
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <AlertRulesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
