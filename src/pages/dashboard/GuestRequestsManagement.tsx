import { useState } from 'react';
import { MessageSquare, Filter } from 'lucide-react';
import { useStaffRequests } from '@/hooks/useStaffRequests';
import RequestsTable from '@/components/qr-management/RequestsTable';
import StaffChatDialog from '@/components/qr-management/StaffChatDialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function GuestRequestsManagement() {
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const { requests, isLoading, updateRequestStatus } = useStaffRequests();

  const filteredRequests = requests.filter((request) => {
    if (statusFilter !== 'all' && request.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && request.priority !== priorityFilter) return false;
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const inProgressCount = requests.filter((r) => r.status === 'in_progress').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Guest Requests
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage requests from QR portal
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span>{pendingCount} Pending</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span>{inProgressCount} In Progress</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border">
        <Filter className="h-5 w-5 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Priority:</span>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(statusFilter !== 'all' || priorityFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('all');
              setPriorityFilter('all');
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      <RequestsTable
        requests={filteredRequests}
        isLoading={isLoading}
        onViewChat={setSelectedRequest}
        onUpdateStatus={updateRequestStatus}
      />

      <StaffChatDialog
        open={!!selectedRequest}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
        request={selectedRequest}
      />
    </div>
  );
}
