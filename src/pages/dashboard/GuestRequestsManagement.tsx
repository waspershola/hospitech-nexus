import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Filter, AlertCircle } from 'lucide-react';
import { useStaffRequests } from '@/hooks/useStaffRequests';
import { useOverdueRequests } from '@/hooks/useOverdueRequests';
import RequestsTable from '@/components/qr-management/RequestsTable';
import StaffChatDialog from '@/components/qr-management/StaffChatDialog';
import { OrderDetailsDrawer } from '@/components/qr-management/OrderDetailsDrawer';
import { QRRequestActions } from '@/components/qr-management/QRRequestActions';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export default function GuestRequestsManagement() {
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedRequestDetails, setSelectedRequestDetails] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
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

  // PHASE-3: Filter and sort requests with overdue detection
  const overdueRequests = getOverdueRequests(requests);
  
  const filteredRequests = requests.filter((request) => {
    if (statusFilter !== 'all' && request.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && request.priority !== priorityFilter) return false;
    if (categoryFilter !== 'all' && request.type !== categoryFilter) return false;
    if (showOverdueOnly && !calculateOverdue(request).isOverdue) return false;
    return true;
  }).sort((a, b) => {
    // Sort by overdue first, then by oldest
    const aOverdue = calculateOverdue(a);
    const bOverdue = calculateOverdue(b);
    
    if (aOverdue.isOverdue && !bOverdue.isOverdue) return -1;
    if (!aOverdue.isOverdue && bOverdue.isOverdue) return 1;
    
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

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

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border">
        <Filter className="h-5 w-5 text-muted-foreground" />
        
        {/* PHASE-3: Overdue filter */}
        <Button
          variant={showOverdueOnly ? 'destructive' : 'outline'}
          size="sm"
          onClick={() => setShowOverdueOnly(!showOverdueOnly)}
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          {showOverdueOnly ? 'Show All' : 'Overdue Only'}
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
        {(statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('all');
              setPriorityFilter('all');
              setCategoryFilter('all');
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

      {selectedRequestDetails && (
        <Sheet open={!!selectedRequestDetails} onOpenChange={(open) => !open && setSelectedRequestDetails(null)}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Request Details</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <QRRequestActions 
                request={selectedRequestDetails}
                onStatusUpdate={fetchRequests}
                onClose={() => setSelectedRequestDetails(null)}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
