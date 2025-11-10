import { useState } from 'react';
import { DepartmentRequest } from '@/hooks/useDepartmentRequests';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, UserPlus, MessageSquare, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getPriorityColor } from '@/utils/priorityEscalation';

interface DepartmentRequestsTableProps {
  requests: DepartmentRequest[];
  isLoading: boolean;
  onClaimRequest: (requestId: string) => void;
  onUpdateStatus: (requestId: string, status: string) => void;
  onUnassignRequest: (requestId: string) => void;
  onViewChat: (request: DepartmentRequest) => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500',
  in_progress: 'bg-blue-500/10 text-blue-500',
  completed: 'bg-green-500/10 text-green-500',
  cancelled: 'bg-red-500/10 text-red-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-500/10 text-gray-500',
  normal: 'bg-blue-500/10 text-blue-500',
  high: 'bg-orange-500/10 text-orange-500',
  urgent: 'bg-red-500/10 text-red-500',
};

export function DepartmentRequestsTable({
  requests,
  isLoading,
  onClaimRequest,
  onUpdateStatus,
  onUnassignRequest,
  onViewChat,
}: DepartmentRequestsTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No requests found</h3>
        <p className="text-sm text-muted-foreground">All caught up! No pending requests at the moment.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Request ID</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Guest/Room</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Response Time</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => {
            const responseTime = (request.status === 'completed' || request.status === 'approved') && request.updated_at
              ? Math.round((new Date(request.updated_at).getTime() - new Date(request.created_at).getTime()) / 60000)
              : null;

            return (
              <TableRow key={request.id}>
                <TableCell className="font-mono text-xs">
                  {request.id.slice(0, 8)}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium capitalize">{request.service_category?.replace('_', ' ') || 'Service'}</p>
                    {request.note && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {request.note}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{request.metadata?.guest_name || request.guest?.name || 'Guest'}</p>
                    {request.room && (
                      <p className="text-xs text-muted-foreground">
                        Room {request.room.number}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(request.escalated_priority || request.priority as any)}>
                      {request.escalated_priority || request.priority}
                    </Badge>
                    {request.is_escalated && (
                      <span title="Priority auto-escalated based on time elapsed">
                        <TrendingUp className="h-4 w-4 text-orange-500" />
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={STATUS_COLORS[request.status] || ''}>
                    {request.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="capitalize">
                  {request.assigned_department?.replace('_', ' ') || 'Unassigned'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  {responseTime !== null ? (
                    <span className="text-xs">{responseTime}m</span>
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      {request.status === 'pending' && !request.assigned_to && (
                        <DropdownMenuItem onClick={() => onClaimRequest(request.id)}>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Claim Request
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuItem onClick={() => onViewChat(request)}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        View Chat
                      </DropdownMenuItem>
                      
                      {request.status === 'in_progress' && (
                        <DropdownMenuItem onClick={() => onUpdateStatus(request.id, 'completed')}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Mark Complete
                        </DropdownMenuItem>
                      )}
                      
                      {(request.status !== 'completed' && request.status !== 'cancelled' && 
                        request.status !== 'approved' && request.status !== 'rejected') && (
                        <DropdownMenuItem onClick={() => onUpdateStatus(request.id, 'cancelled')}>
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancel Request
                        </DropdownMenuItem>
                      )}
                      
                      {request.assigned_to && (request.status !== 'completed' && request.status !== 'approved') && (
                        <DropdownMenuItem onClick={() => onUnassignRequest(request.id)}>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Return to Pool
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
