import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { TicketForm } from '@/components/support/TicketForm';
import { TicketDetail } from '@/components/support/TicketDetail';
import { MessageSquare, Plus, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { SupportTicket } from '@/hooks/useSupportTickets';

const getPriorityBadge = (priority: string) => {
  const variants = {
    low: 'secondary' as const,
    medium: 'default' as const,
    high: 'destructive' as const,
    critical: 'destructive' as const,
  };

  return (
    <Badge variant={variants[priority as keyof typeof variants] || 'default'}>
      {priority}
    </Badge>
  );
};

const getStatusBadge = (status: string) => {
  const variants = {
    open: 'outline' as const,
    in_progress: 'default' as const,
    resolved: 'secondary' as const,
    closed: 'secondary' as const,
  };

  return (
    <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
      {status.replace('_', ' ')}
    </Badge>
  );
};

export default function Support() {
  const { tickets, isLoading, createTicket } = useSupportTickets();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const handleCreateTicket = (data: { subject: string; description: string; priority: string }) => {
    createTicket.mutate(data, {
      onSuccess: () => {
        setCreateDialogOpen(false);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Support Tickets</h1>
            <p className="text-muted-foreground">
              Submit and track support requests
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              My Tickets
            </CardTitle>
            <CardDescription>
              View and manage your support tickets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!tickets || tickets.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No support tickets yet</p>
                <Button onClick={() => setCreateDialogOpen(true)} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Ticket
                </Button>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow
                      key={ticket.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <TableCell className="font-mono text-sm">
                        {ticket.ticket_number}
                      </TableCell>
                      <TableCell className="font-medium">{ticket.subject}</TableCell>
                      <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                      <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(ticket.created_at), {
                          addSuffix: true,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Ticket Dialog */}
      <TicketForm
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateTicket}
        isSubmitting={createTicket.isPending}
      />

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="sm:max-w-[700px]">
          {selectedTicket && <TicketDetail ticket={selectedTicket} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
