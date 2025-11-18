import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useNightAudit } from '@/hooks/useNightAudit';
import { useState } from 'react';
import { format } from 'date-fns';
import { Clock, CheckCircle2, XCircle, Play, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/finance/tax';

export default function NightAudit() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { runAudit, isRunning, auditHistory, isLoading } = useNightAudit();

  const handleRunAudit = async () => {
    runAudit(selectedDate);
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      completed: { variant: 'default' as const, icon: CheckCircle2, color: 'text-green-500' },
      running: { variant: 'secondary' as const, icon: Clock, color: 'text-blue-500' },
      failed: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-500' }
    };
    const config = configs[status as keyof typeof configs] || configs.running;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className={`w-3 h-3 ${config.color}`} />
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Night Audit</h1>
        <p className="text-muted-foreground">End-of-day financial reconciliation and reporting</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              Run Night Audit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Audit Date</label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </div>
            <Button 
              onClick={handleRunAudit} 
              disabled={isRunning}
              className="w-full"
              size="lg"
            >
              {isRunning ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Running Audit...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Night Audit
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              This process will freeze all open folios, calculate revenue, generate reports, and close eligible folios.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Recent Audits
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading history...</div>
            ) : !auditHistory || auditHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No audit history</div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {auditHistory.slice(0, 5).map(audit => (
                  <div key={audit.id} className="p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold">{format(new Date(audit.audit_date), 'MMMM d, yyyy')}</div>
                        <div className="text-xs text-muted-foreground">
                          {audit.completed_at 
                            ? `Completed ${format(new Date(audit.completed_at), 'h:mm a')}`
                            : `Started ${format(new Date(audit.started_at), 'h:mm a')}`
                          }
                        </div>
                      </div>
                      {getStatusBadge(audit.status)}
                    </div>
                    {audit.total_revenue && (
                      <div className="text-sm">
                        Revenue: <span className="font-semibold">{formatCurrency(audit.total_revenue, 'NGN')}</span>
                      </div>
                    )}
                    {audit.total_folios_processed > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {audit.total_folios_processed} folios processed
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Audit History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Audit History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : !auditHistory || auditHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No audits have been run yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Folios</TableHead>
                  <TableHead>Reports</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditHistory.map(audit => (
                  <TableRow key={audit.id}>
                    <TableCell className="font-medium">
                      {format(new Date(audit.audit_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>{getStatusBadge(audit.status)}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(audit.started_at), 'h:mm a')}
                    </TableCell>
                    <TableCell className="text-sm">
                      {audit.completed_at ? format(new Date(audit.completed_at), 'h:mm a') : '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {audit.total_revenue ? formatCurrency(audit.total_revenue, 'NGN') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {audit.total_folios_processed || 0}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {(audit as any).night_audit_reports?.[0]?.count || 0} reports
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
