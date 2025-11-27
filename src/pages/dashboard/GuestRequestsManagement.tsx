import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Filter, AlertCircle, MoveRight, Search } from 'lucide-react';
import { useStaffRequests } from '@/hooks/useStaffRequests';
import { useOverdueRequests } from '@/hooks/useOverdueRequests';
import RequestsTable from '@/components/qr-management/RequestsTable';
import StaffChatDialog from '@/components/qr-management/StaffChatDialog';
import { OrderDetailsDrawer } from '@/components/qr-management/OrderDetailsDrawer';
import { QRRequestDrawer } from '@/components/qr-management/QRRequestDrawer';
import { Button } from '@/components/ui/button';
import { generateRequestReference } from '@/lib/qr/requestReference';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';
import { groupRequestsByDate } from '@/utils/dateGrouping';

export default function GuestRequestsManagement() {
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedRequestDetails, setSelectedRequestDetails] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [showFrontDeskOnly, setShowFrontDeskOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { requests, isLoading, updateRequestStatus, fetchRequests } = useStaffRequests();
  const { getOverdueRequests, calculateOverdue } = useOverdueRequests();

  // Fetch order details when viewing an order
  const { data: orderData } = useQuery({
    queryKey: ['guest-order', selectedOrder?.id],
    queryFn: async () => {
      if (!selectedOrder) return null;
      const { data, error } = await supabase
        .from('guest_orders')
        .select('*, room:rooms(number)')
        .eq('request_id', selectedOrder.id)
        .single();
      
      if (error) throw error;
      return { ...data, ...selectedOrder };
    },
    enabled: !!selectedOrder,
  });

  // PHASE-3: Filter and sort requests with overdue detection and search
  const overdueRequests = getOverdueRequests(requests);
  
  const filteredRequests = requests.filter((request) => {
    if (statusFilter !== 'all' && request.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && request.priority !== priorityFilter) return false;
    if (categoryFilter !== 'all' && request.type !== categoryFilter) return false;
    if (showOverdueOnly && !calculateOverdue(request).isOverdue) return false;
    if (showFrontDeskOnly && !request.transferred_to_frontdesk) return false;
    
    // Search filter: search across service, guest, room, priority, status, billing
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      const guestName = request.guest_name || request.metadata?.guest_name || '';
      const guestContact = request.guest_contact || request.metadata?.guest_contact || '';
      const roomNumber = request.metadata?.room_number || request.room?.number || '';
      const billingStatus = (request as any).billing_status || 'none';
      
      const matchesSearch = 
        request.type.toLowerCase().includes(searchLower) ||
        guestName.toLowerCase().includes(searchLower) ||
        guestContact.toLowerCase().includes(searchLower) ||
        roomNumber.toString().toLowerCase().includes(searchLower) ||
        request.priority.toLowerCase().includes(searchLower) ||
        request.status.toLowerCase().includes(searchLower) ||
        billingStatus.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }
    
    return true;
  });

  // Group requests by date category (Overdue → Today → Yesterday → Older)
  const groupedRequests = groupRequestsByDate(filteredRequests, calculateOverdue);

  const handleUpdateOrderStatus = async (status: string) => {
    if (!orderData) return;
    
    await supabase
      .from('guest_orders')
      .update({ status })
      .eq('id', orderData.id);
    
    await updateRequestStatus(orderData.request_id, status === 'delivered' ? 'completed' : 'in_progress');
    setSelectedOrder(null);
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const inProgressCount = requests.filter((r) => r.status === 'in_progress').length;
  const frontDeskCount = requests.filter((r) => r.transferred_to_frontdesk).length;

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
          {/* PHASE-3: Overdue badge */}
          {overdueRequests.length > 0 && (
            <Badge variant="destructive" className="gap-2 text-base px-3 py-1.5 animate-pulse">
              <AlertCircle className="h-4 w-4" />
              {overdueRequests.length} Overdue
            </Badge>
          )}
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

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border flex-wrap">
        <Filter className="h-5 w-5 text-muted-foreground" />
        
        {/* Search Input */}
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by service, guest, room, status, or billing..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* PHASE-3: Overdue filter */}
        <Button
          variant={showOverdueOnly ? 'destructive' : 'outline'}
          size="sm"
          onClick={() => setShowOverdueOnly(!showOverdueOnly)}
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          {showOverdueOnly ? 'Show All' : 'Overdue Only'}
        </Button>

        {/* PHASE-3-TRANSFER-V1: Front Desk Billing Tasks filter */}
        <Button
          variant={showFrontDeskOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowFrontDeskOnly(!showFrontDeskOnly)}
        >
          <MoveRight className="h-4 w-4 mr-2" />
          {showFrontDeskOnly ? 'Show All' : 'Front Desk Billing Tasks'}
          {frontDeskCount > 0 && (
            <Badge className="ml-2" variant="secondary">
              {frontDeskCount}
            </Badge>
          )}
        </Button>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Category:</span>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
              <SelectItem value="digital_menu">Digital Menu</SelectItem>
              <SelectItem value="housekeeping">Housekeeping</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="room_service">Room Service</SelectItem>
              <SelectItem value="concierge">Concierge</SelectItem>
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
        {(statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all' || searchQuery || showOverdueOnly || showFrontDeskOnly) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('all');
              setPriorityFilter('all');
              setCategoryFilter('all');
              setSearchQuery('');
              setShowOverdueOnly(false);
              setShowFrontDeskOnly(false);
            }}
          >
            Clear All Filters
          </Button>
        )}
      </div>

      <RequestsTable
        requests={groupedRequests}
        grouped={true}
        isLoading={isLoading}
        onViewChat={setSelectedRequest}
        onUpdateStatus={updateRequestStatus}
        onViewDetails={setSelectedRequestDetails}
        onViewOrder={(request) => {
          // Route to correct drawer based on service type
          if (['digital_menu', 'room_service'].includes(request.type)) {
            setSelectedOrder(request);
          } else {
            setSelectedRequestDetails(request);
          }
        }}
      />

      <StaffChatDialog
        open={!!selectedRequest}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
        request={selectedRequest}
      />

      <OrderDetailsDrawer
        order={orderData}
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
        onUpdateStatus={handleUpdateOrderStatus}
        onOpenChat={() => {
          setSelectedRequest(selectedOrder);
          setSelectedOrder(null);
        }}
      />

      <QRRequestDrawer
        open={!!selectedRequestDetails}
        onOpenChange={(open) => !open && setSelectedRequestDetails(null)}
        mode="department"
        selectedRequestId={selectedRequestDetails?.id}
        hideRequestList={true}
      />
    </div>
  );
}
