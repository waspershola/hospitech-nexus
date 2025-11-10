import { useState } from 'react';
import { useDepartmentRequests } from '@/hooks/useDepartmentRequests';
import { DepartmentMetricsCards } from '@/components/department-requests/DepartmentMetricsCards';
import { DepartmentRequestsTable } from '@/components/department-requests/DepartmentRequestsTable';
import StaffChatDialog from '@/components/qr-management/StaffChatDialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function DepartmentRequestsDashboard() {
  const queryClient = useQueryClient();
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const {
    requests,
    isLoading,
    metrics,
    claimRequest,
    updateRequestStatus,
    unassignRequest,
  } = useDepartmentRequests(selectedDepartment);

  // Apply additional filters
  const filteredRequests = requests.filter((request) => {
    if (statusFilter !== 'all' && request.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && request.priority !== priorityFilter) return false;
    return true;
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['department-requests'] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Department Requests
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and track requests by department with real-time updates
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Metrics Cards */}
      <DepartmentMetricsCards metrics={metrics} />

      {/* Filters */}
      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border">
        <Filter className="h-5 w-5 text-muted-foreground" />
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Department:</span>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="restaurant">Restaurant</SelectItem>
              <SelectItem value="housekeeping">Housekeeping</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="front_office">Front Office</SelectItem>
              <SelectItem value="concierge">Concierge</SelectItem>
              <SelectItem value="spa">Spa</SelectItem>
              <SelectItem value="laundry">Laundry</SelectItem>
            </SelectContent>
          </Select>
        </div>

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

        {(statusFilter !== 'all' || priorityFilter !== 'all' || selectedDepartment !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('all');
              setPriorityFilter('all');
              setSelectedDepartment('all');
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Requests Table */}
      <DepartmentRequestsTable
        requests={filteredRequests}
        isLoading={isLoading}
        onClaimRequest={claimRequest}
        onUpdateStatus={updateRequestStatus}
        onUnassignRequest={unassignRequest}
        onViewChat={setSelectedRequest}
      />

      {/* Chat Dialog */}
      <StaffChatDialog
        open={!!selectedRequest}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
        request={selectedRequest}
      />
    </div>
  );
}
