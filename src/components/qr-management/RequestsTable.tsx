import { format } from 'date-fns';
import { MessageSquare, Clock, CheckCircle2, XCircle, UtensilsCrossed } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RequestsTableProps {
  requests: any[];
  isLoading: boolean;
  onViewChat: (request: any) => void;
  onUpdateStatus: (requestId: string, status: string) => Promise<boolean>;
  onViewOrder?: (request: any) => void;
}

export default function RequestsTable({
  requests,
  isLoading,
  onViewChat,
  onUpdateStatus,
  onViewOrder,
}: RequestsTableProps) {
  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; icon: any }> = {
      pending: { variant: 'secondary', icon: Clock },
      in_progress: { variant: 'default', icon: Clock },
      completed: { variant: 'default', icon: CheckCircle2 },
      cancelled: { variant: 'destructive', icon: XCircle },
    };

    const { variant, icon: Icon } = config[status] || config.pending;

    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      low: 'secondary',
      normal: 'default',
      high: 'default',
      urgent: 'destructive',
    };

    return (
      <Badge variant={variants[priority] || 'secondary'}>
        {priority}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 border border-border rounded-lg bg-card">
        <p className="text-muted-foreground">No QR-based requests yet.</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Service</TableHead>
            <TableHead>Guest Info</TableHead>
            <TableHead>Room</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {request.service_category === 'menu_order' && (
                      <Badge variant="secondary" className="gap-1">
                        <UtensilsCrossed className="h-3 w-3" />
                        Menu Order
                      </Badge>
                    )}
                    <span className="font-medium capitalize">
                      {request.service_category.replace('_', ' ')}
                    </span>
                  </div>
                  {request.note && (
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {request.service_category === 'housekeeping' 
                        ? `${JSON.parse(request.note).length} services selected`
                        : request.note}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{request.metadata?.guest_name || 'Anonymous'}</div>
                  {request.metadata?.guest_contact && (
                    <div className="text-muted-foreground">
                      {request.metadata.guest_contact}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {request.room?.number || (
                  <span className="text-muted-foreground">Common Area</span>
                )}
              </TableCell>
              <TableCell>{getPriorityBadge(request.priority)}</TableCell>
              <TableCell>
                <Select
                  value={request.status}
                  onValueChange={(value) => onUpdateStatus(request.id, value)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                {format(new Date(request.created_at), 'MMM d, h:mm a')}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-2 justify-end">
                  {['digital_menu', 'menu_order', 'room_service', 'laundry', 'spa', 'dining_reservation', 'housekeeping', 'maintenance', 'concierge'].includes(request.service_category) && onViewOrder && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewOrder(request)}
                    >
                      <UtensilsCrossed className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewChat(request)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
