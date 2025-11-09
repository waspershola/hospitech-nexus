import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePlatformSMSMonitoring } from '@/hooks/usePlatformSMSMonitoring';
import { MessageSquare, TrendingUp, AlertCircle, CheckCircle, XCircle, Phone, Mail, Copy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export function PlatformSMSManagementTab() {
  const { deliveryLogs, passwordLogs, creditStats, providerHealth, todayStats, recentFailures, isLoading } = usePlatformSMSMonitoring();
  const [searchTerm, setSearchTerm] = useState('');

  if (isLoading) {
    return <div>Loading SMS management data...</div>;
  }

  const filteredDeliveryLogs = deliveryLogs?.filter(log => 
    log.recipient?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.tenant?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.event_key?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPasswordLogs = passwordLogs?.filter(log => {
    const metadata = log.metadata as any;
    return searchTerm === '' || metadata?.phone?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SMS Sent Today</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats?.totalSent || 0}</div>
            <p className="text-xs text-muted-foreground">
              {todayStats?.totalFailed || 0} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {todayStats?.successRate ? `${todayStats.successRate.toFixed(1)}%` : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">Today's performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Remaining</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {creditStats?.remainingCredits?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              of {creditStats?.totalCredits?.toLocaleString() || 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Providers</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {providerHealth?.filter(p => p.is_active).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              of {providerHealth?.length || 0} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Failures Alert */}
      {recentFailures && recentFailures.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Recent SMS Failures ({recentFailures.length})
            </CardTitle>
            <CardDescription>Latest SMS delivery failures requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recentFailures.slice(0, 5).map((failure, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm border-b pb-2">
                  <div>
                    <span className="font-medium">{failure.recipient}</span>
                    <span className="text-muted-foreground ml-2">
                      ({failure.tenant?.name || 'Unknown'})
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {failure.failed_at ? formatDistanceToNow(new Date(failure.failed_at), { addSuffix: true }) : 'Unknown'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Provider Health Status */}
      <Card>
        <CardHeader>
          <CardTitle>Provider Health Status</CardTitle>
          <CardDescription>Monitor SMS provider performance and availability</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {providerHealth?.map((provider) => (
              <div key={provider.id} className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${provider.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div>
                    <div className="font-medium capitalize">{provider.provider_type}</div>
                    <div className="text-xs text-muted-foreground">
                      {provider.lastUsed 
                        ? `Last used ${formatDistanceToNow(new Date(provider.lastUsed), { addSuffix: true })}`
                        : 'Never used'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium">{provider.successRate.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">Success rate</div>
                  </div>
                  <Badge variant={provider.is_active ? 'default' : 'secondary'}>
                    {provider.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <Input 
          placeholder="Search by phone, tenant, or event..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Logs Tabs */}
      <Tabs defaultValue="delivery" className="space-y-4">
        <TabsList>
          <TabsTrigger value="delivery">SMS Delivery Logs</TabsTrigger>
          <TabsTrigger value="passwords">Password Delivery Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="delivery">
          <Card>
            <CardHeader>
              <CardTitle>SMS Delivery Logs</CardTitle>
              <CardDescription>View all SMS messages sent across all tenants</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDeliveryLogs?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs">
                          {log.sent_at ? formatDistanceToNow(new Date(log.sent_at), { addSuffix: true }) : 'N/A'}
                        </TableCell>
                        <TableCell className="font-medium">{log.tenant?.name || 'Unknown'}</TableCell>
                        <TableCell className="font-mono text-xs">{log.recipient}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.event_key}</Badge>
                        </TableCell>
                        <TableCell className="capitalize">{log.provider}</TableCell>
                        <TableCell>
                          <Badge variant={log.status === 'sent' ? 'default' : 'destructive'}>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.cost || 0} credits</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="passwords">
          <Card>
            <CardHeader>
              <CardTitle>Password Delivery Logs</CardTitle>
              <CardDescription>Track password reset and delivery attempts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Delivered By</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPasswordLogs?.map((log) => {
                      const metadata = log.metadata as any;
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs">
                            {formatDistanceToNow(new Date(log.delivered_at), { addSuffix: true })}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{log.user_id.slice(0, 8)}...</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {log.delivery_method === 'sms' && <Phone className="h-3 w-3" />}
                              {log.delivery_method === 'email' && <Mail className="h-3 w-3" />}
                              {log.delivery_method === 'manual' && <Copy className="h-3 w-3" />}
                              <span className="capitalize">{log.delivery_method}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.delivery_status === 'sent' ? 'default' : 'destructive'}>
                              {log.delivery_status}
                            </Badge>
                          </TableCell>
                          <TableCell>{log.delivered_by || 'System'}</TableCell>
                          <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                            {log.error_message || metadata?.phone || 'N/A'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
