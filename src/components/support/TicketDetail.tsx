import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SupportTicket } from '@/hooks/useSupportTickets';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, CheckCircle, Clock, MessageSquare } from 'lucide-react';

interface TicketDetailProps {
  ticket: SupportTicket;
}

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

export function TicketDetail({ ticket }: TicketDetailProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {ticket.ticket_number}
            </CardTitle>
            <CardDescription>{ticket.subject}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getPriorityBadge(ticket.priority)}
            {getStatusBadge(ticket.status)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Description</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {ticket.description}
          </p>
        </div>

        {ticket.resolution_notes && (
          <div>
            <h4 className="text-sm font-medium mb-2">Resolution Notes</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {ticket.resolution_notes}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 pt-4 border-t text-sm">
          <div>
            <span className="text-muted-foreground">Created:</span>
            <p className="font-medium">
              {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
            </p>
          </div>
          {ticket.resolved_at && (
            <div>
              <span className="text-muted-foreground">Resolved:</span>
              <p className="font-medium">
                {formatDistanceToNow(new Date(ticket.resolved_at), { addSuffix: true })}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
