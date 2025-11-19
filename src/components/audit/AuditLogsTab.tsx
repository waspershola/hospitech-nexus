import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuditLogs, useAuditActions, useAuditTables, type AuditLogFilters } from '@/hooks/useAuditLogs';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Filter, X, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function AuditLogsTab() {
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const pageSize = 50;

  const { data, isLoading } = useAuditLogs(filters, page, pageSize);
  const { data: actions } = useAuditActions();
  const { data: tables } = useAuditTables();

  const totalPages = Math.ceil((data?.total || 0) / pageSize);

  const updateFilter = (key: keyof AuditLogFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page on filter change
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      INSERT: 'default',
      UPDATE: 'secondary',
      DELETE: 'destructive',
    };
    return variants[action] || 'default';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold">Audit Trails</h2>
        <p className="text-sm text-muted-foreground">
          Complete history of all system changes and actions
        </p>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Filters</CardTitle>
              <CardDescription>Filter audit logs by various criteria</CardDescription>
            </div>
            {Object.keys(filters).length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* User ID Filter */}
            <div className="space-y-2">
              <Label>User ID</Label>
              <Input
                placeholder="Enter user ID..."
                value={filters.user_id || ''}
                onChange={(e) => updateFilter('user_id', e.target.value || undefined)}
              />
            </div>

            {/* Action Filter */}
            <div className="space-y-2">
              <Label>Action</Label>
              <Select
                value={filters.action || 'all'}
                onValueChange={(value) => updateFilter('action', value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {actions?.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table Filter */}
            <div className="space-y-2">
              <Label>Table</Label>
              <Select
                value={filters.table_name || 'all'}
                onValueChange={(value) => updateFilter('table_name', value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All tables" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tables</SelectItem>
                  {tables?.map((table) => (
                    <SelectItem key={table} value={table}>
                      {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date Filter */}
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !filters.start_date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.start_date ? format(filters.start_date, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.start_date}
                    onSelect={(date) => updateFilter('start_date', date)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date Filter */}
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !filters.end_date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.end_date ? format(filters.end_date, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.end_date}
                    onSelect={(date) => updateFilter('end_date', date)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Room/Booking ID Filter */}
            <div className="space-y-2">
              <Label>Record ID</Label>
              <Input
                placeholder="Room/Booking ID..."
                value={filters.room_id || filters.booking_id || ''}
                onChange={(e) => {
                  updateFilter('room_id', e.target.value || undefined);
                  updateFilter('booking_id', e.target.value || undefined);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Audit Logs</CardTitle>
            <div className="text-sm text-muted-foreground">
              {data?.total || 0} total records
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : data?.logs && data.logs.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Record ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.user?.full_name || 'System'}</div>
                          <div className="text-xs text-muted-foreground">{log.user?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadge(log.action)}>{log.action}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{log.table_name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {log.record_id?.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Filter className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No audit logs found matching the current filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Timestamp</Label>
                  <p className="font-mono text-sm">
                    {format(new Date(selectedLog.created_at), 'PPpp')}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Action</Label>
                  <div className="mt-1">
                    <Badge variant={getActionBadge(selectedLog.action)}>
                      {selectedLog.action}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">User</Label>
                  <p className="text-sm">{selectedLog.user?.full_name || 'System'}</p>
                  <p className="text-xs text-muted-foreground">{selectedLog.user?.email}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Table</Label>
                  <p className="font-mono text-sm">{selectedLog.table_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Record ID</Label>
                  <p className="font-mono text-xs break-all">{selectedLog.record_id}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">IP Address</Label>
                  <p className="font-mono text-sm">{selectedLog.ip_address || 'N/A'}</p>
                </div>
              </div>

              {selectedLog.before_data && (
                <div>
                  <Label className="text-xs text-muted-foreground">Before Data</Label>
                  <pre className="mt-1 p-3 bg-muted rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.before_data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.after_data && (
                <div>
                  <Label className="text-xs text-muted-foreground">After Data</Label>
                  <pre className="mt-1 p-3 bg-muted rounded text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.after_data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.user_agent && (
                <div>
                  <Label className="text-xs text-muted-foreground">User Agent</Label>
                  <p className="text-xs text-muted-foreground break-all">{selectedLog.user_agent}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
