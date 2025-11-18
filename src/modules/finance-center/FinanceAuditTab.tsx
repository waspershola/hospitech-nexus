import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ShieldAlert } from 'lucide-react';

export function FinanceAuditTab() {
  const { tenantId } = useAuth();

  const { data: auditEvents, isLoading } = useQuery({
    queryKey: ['finance-audit-events', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_audit_events')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId
  });

  const getEventBadge = (eventType: string) => {
    const colors: Record<string, 'default' | 'secondary' | 'destructive'> = {
      payment_posted: 'default',
      payment_reversed: 'destructive',
      wallet_transaction: 'secondary',
      reconciliation_matched: 'default',
      platform_fee_recorded: 'secondary'
    };
    return <Badge variant={colors[eventType] || 'default'}>{eventType}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" />
            Finance Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading audit events...</div>
          ) : !auditEvents || auditEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No audit events found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="text-sm">
                      {format(new Date(event.created_at), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>{getEventBadge(event.event_type)}</TableCell>
                    <TableCell className="text-sm font-mono">
                      {event.target_id?.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {event.payload && typeof event.payload === 'object' 
                        ? JSON.stringify(event.payload).slice(0, 50) + '...'
                        : '-'
                      }
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
