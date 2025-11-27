import { format } from 'date-fns';
import { MessageSquare, Clock, CheckCircle2, XCircle, UtensilsCrossed, MapPin, AlertCircle } from 'lucide-react';
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
import { useOverdueRequests } from '@/hooks/useOverdueRequests';
import { generateRequestReference } from '@/lib/qr/requestReference';
import { getBillingStatusLabel, getBillingStatusColor } from '@/lib/qr/billingStatus';
import { Gift, FileText, DollarSign, ArrowRight } from 'lucide-react';

interface RequestsTableProps {
  requests: any[];
  isLoading: boolean;
  onViewChat: (request: any) => void;
  onUpdateStatus: (requestId: string, status: string) => Promise<boolean>;
  onViewOrder?: (request: any) => void;
  onViewDetails?: (request: any) => void;
}

export default function RequestsTable({
  requests,
  isLoading,
  onViewChat,
  onUpdateStatus,
  onViewOrder,
  onViewDetails,
}: RequestsTableProps) {
  const { calculateOverdue } = useOverdueRequests();

  const getStatusBadge = (status: string, overdueInfo?: { isOverdue: boolean; minutesOverdue: number }) => {
    // PHASE-3: Show overdue badge for pending requests past SLA
    if (overdueInfo?.isOverdue && status === 'pending') {
      return (
        <Badge variant="destructive" className="gap-1 animate-pulse">
          <AlertCircle className="h-3 w-3" />
          Overdue ({overdueInfo.minutesOverdue} min)
        </Badge>
      );
    }

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

  // Phase 3: Enhanced billing context display
  const getBillingBadge = (request: any) => {
    // Priority 1: Check if complimentary
    if (request.metadata?.complimentary === true) {
      return (
        <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <Gift className="h-3 w-3" />
          Complimentary
        </Badge>
      );
    }

    // Priority 2: Check if transferred to front desk
    if (request.transferred_to_frontdesk) {
      return (
        <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
          <ArrowRight className="h-3 w-3" />
          Pending Front Desk
        </Badge>
      );
    }

    // Priority 3: Check if billed to folio
    if (request.billing_status === 'posted_to_folio') {
      return (
        <Badge variant="default" className="gap-1">
          <FileText className="h-3 w-3" />
          Billed to Folio
        </Badge>
      );
    }

    // Priority 4: Check if paid direct
    if (request.billing_status === 'paid_direct') {
      return (
        <Badge variant="default" className="gap-1 bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200">
          <DollarSign className="h-3 w-3" />
          Paid
        </Badge>
      );
    }

    // Default: No billing action yet
    if (request.billing_status && request.billing_status !== 'none') {
      return (
        <Badge variant={getBillingStatusColor(request.billing_status)}>
          {getBillingStatusLabel(request.billing_status)}
        </Badge>
      );
    }

    return <span className="text-muted-foreground text-xs">—</span>;
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
        <p className="text-muted-foreground">
          No requests found matching your filters.
        </p>
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
            <TableHead>Billing</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => {
            const overdueInfo = calculateOverdue(request);
            return (
            <TableRow key={request.id} className={overdueInfo.isOverdue ? 'bg-destructive/5' : ''}>
              <TableCell>
                <div className="space-y-1">
                  <div className="text-xs font-mono text-muted-foreground mb-1">
                    {generateRequestReference(request.id)}
                  </div>
                  <div className="flex items-center gap-2">
                    {request.type === 'menu_order' && (
                      <Badge variant="secondary" className="gap-1">
                        <UtensilsCrossed className="h-3 w-3" />
                        Menu Order
                      </Badge>
                    )}
                    <span className="font-medium capitalize">
                      {request.type.replace('_', ' ')}
                    </span>
                  </div>
                  {request.note && (
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {request.type === 'housekeeping'
                        ? (() => {
                            try {
                              const parsed = JSON.parse(request.note);
                              return `${parsed.length} services selected`;
                            } catch {
                              return request.note;
                            }
                          })()
                        : request.note}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div className="font-medium">
                    {request.guest_name ||
                      request.metadata?.guest_name ||
                      request.guest_order?.[0]?.guest_name ||
                      'Guest'}
                  </div>
                  {(request.guest_contact || request.metadata?.guest_contact) && (
                    <div className="text-xs text-muted-foreground">
                      {request.guest_contact || request.metadata?.guest_contact}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {request.metadata?.room_number || request.room?.number ? (
                    <>
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span>{request.metadata?.room_number || request.room?.number}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Common Area</span>
                  )}
                </div>
              </TableCell>
              <TableCell>{getPriorityBadge(request.priority)}</TableCell>
              <TableCell>
                {getStatusBadge(request.status, overdueInfo)}
              </TableCell>
              <TableCell>
                {/* Phase 3: Enhanced billing context display */}
                {getBillingBadge(request)}
              </TableCell>
              <TableCell>
                {format(new Date(request.created_at), 'MMM d, h:mm a')}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-2 justify-end">
                  {onViewDetails && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(request)}
                    >
                      View Actions
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
          )})}
        </TableBody>
      </Table>
    </div>
  );
}
