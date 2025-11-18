import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ConfigCard } from '../shared/ConfigCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { AuditLogDetailModal } from '../AuditLogDetailModal';

export function AuditLogsTab() {
  const { tenantId } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    action: 'all',
    table: 'all',
    search: ''
  });
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    loadLogs();
  }, [tenantId, filters, page]);

  const loadLogs = async () => {
    if (!tenantId) return;

    setLoading(true);
    let query = supabase
      .from('hotel_audit_logs')
      .select('*, profiles(full_name)', { count: 'exact' })
      .eq('tenant_id', tenantId);

    // Apply filters
    if (filters.action !== 'all') {
      query = query.eq('action', filters.action);
    }
    if (filters.table !== 'all') {
      query = query.eq('table_name', filters.table);
    }
    if (filters.search) {
      query = query.ilike('record_id', `%${filters.search}%`);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      console.error('Failed to load audit logs:', error);
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      INSERT: 'default',
      UPDATE: 'secondary',
      DELETE: 'destructive',
    };
    return <Badge variant={variants[action] || 'default'}>{action}</Badge>;
  };

  return (
    <>
      <ConfigCard
        title="Configuration Audit Trail"
        description="Track all changes to hotel settings"
        icon={Clock}
      >
        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <Select value={filters.action} onValueChange={(value) => setFilters(prev => ({ ...prev, action: value }))}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="INSERT">INSERT</SelectItem>
              <SelectItem value="UPDATE">UPDATE</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.table} onValueChange={(value) => setFilters(prev => ({ ...prev, table: value }))}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tables</SelectItem>
              <SelectItem value="bookings">Bookings</SelectItem>
              <SelectItem value="rooms">Rooms</SelectItem>
              <SelectItem value="guests">Guests</SelectItem>
              <SelectItem value="payments">Payments</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Search record ID..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="max-w-xs"
          />
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No audit logs found</div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Record ID</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow 
                      key={log.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedLog(log);
                        setModalOpen(true);
                      }}
                    >
                      <TableCell className="text-sm">
                        {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.profiles?.full_name || 'Unknown User'}
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell className="text-sm font-mono">{log.table_name}</TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">
                        {log.record_id?.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">View</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {page} • {pageSize} per page
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={logs.length < pageSize}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </ConfigCard>

      <AuditLogDetailModal
        log={selectedLog}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}
