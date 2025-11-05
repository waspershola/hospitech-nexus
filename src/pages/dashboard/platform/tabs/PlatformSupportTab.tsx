import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useSupportTickets, type SupportTicket } from '@/hooks/useSupportTickets';
import { TicketDetail } from '@/components/support/TicketDetail';
import { MessageSquare, AlertCircle, Clock, CheckCircle, Filter } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const getPriorityBadge = (priority: string) => {
  const variants = {
    low: 'secondary' as const,
    medium: 'default' as const,
    high: 'destructive' as const,
    critical: 'destructive' as const,
  };

  return (
    <Badge variant={variants[priority as keyof typeof variants] || 'default'}>
      {priority.toUpperCase()}
    </Badge>
  );
};

const getStatusBadge = (status: string) => {
  const config = {
    open: { variant: 'outline' as const, icon: AlertCircle, color: 'text-yellow-600' },
    in_progress: { variant: 'default' as const, icon: Clock, color: 'text-blue-600' },
    resolved: { variant: 'secondary' as const, icon: CheckCircle, color: 'text-green-600' },
    closed: { variant: 'secondary' as const, icon: CheckCircle, color: 'text-muted-foreground' },
  };

  const statusConfig = config[status as keyof typeof config] || config.open;
  const Icon = statusConfig.icon;

  return (
    <Badge variant={statusConfig.variant} className="gap-1">
      <Icon className={`h-3 w-3 ${statusConfig.color}`} />
      {status.replace('_', ' ').toUpperCase()}
    </Badge>
  );
};

export function PlatformSupportTab() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateData, setUpdateData] = useState<{
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'critical';
    resolution_notes: string;
  }>({
    status: 'open',
    priority: 'medium',
    resolution_notes: '',
  });

  const { tickets, isLoading, updateTicket } = useSupportTickets(
    statusFilter !== 'all' ? { status: statusFilter } : undefined
  );

  const handleOpenUpdateDialog = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setUpdateData({
      status: ticket.status,
      priority: ticket.priority,
      resolution_notes: ticket.resolution_notes || '',
    });
    setUpdateDialogOpen(true);
  };

  const handleUpdateTicket = () => {
    if (!selectedTicket) return;
    updateTicket.mutate(
      {
        ticketId: selectedTicket.id,
        updates: updateData,
      },
      {
        onSuccess: () => {
          setUpdateDialogOpen(false);
          setSelectedTicket(null);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const openTickets = tickets?.filter((t) => t.status === 'open') || [];
  const inProgressTickets = tickets?.filter((t) => t.status === 'in_progress') || [];
  const resolvedTickets = tickets?.filter((t) => t.status === 'resolved') || [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Support Tickets
              </CardTitle>
              <CardDescription>
                Manage tenant support requests and issues
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tickets</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Open</div>
              <div className="text-2xl font-bold">{openTickets.length}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">In Progress</div>
              <div className="text-2xl font-bold">{inProgressTickets.length}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Resolved</div>
              <div className="text-2xl font-bold">{resolvedTickets.length}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!tickets || tickets.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No support tickets {statusFilter !== 'all' && `with status: ${statusFilter}`}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket #</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-mono text-sm">
                      {ticket.ticket_number}
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="font-medium">{ticket.subject}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {ticket.description}
                      </div>
                    </TableCell>
                    <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(ticket.created_at), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenUpdateDialog(ticket)}
                      >
                        Update
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Update Ticket Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Update Ticket - {selectedTicket?.ticket_number}</DialogTitle>
            <DialogDescription>{selectedTicket?.subject}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={updateData.status}
                onValueChange={(value) => setUpdateData({ ...updateData, status: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={updateData.priority}
                onValueChange={(value) => setUpdateData({ ...updateData, priority: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Resolution Notes</Label>
              <Textarea
                placeholder="Add notes about how this ticket was resolved..."
                value={updateData.resolution_notes}
                onChange={(e) =>
                  setUpdateData({ ...updateData, resolution_notes: e.target.value })
                }
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTicket} disabled={updateTicket.isPending}>
              Update Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
