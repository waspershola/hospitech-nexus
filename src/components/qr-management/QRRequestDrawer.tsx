import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useStaffRequests } from '@/hooks/useStaffRequests';
import { useStaffChat } from '@/hooks/useStaffChat';
import { useRequestHistory } from '@/hooks/useRequestHistory';
import { useOrderDetails } from '@/hooks/useOrderDetails';
import { RequestPaymentInfo } from './RequestPaymentInfo';
import { format } from 'date-fns';
import { useQueries } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageSquare, Clock, CheckCircle2, XCircle, AlertCircle, Send,
  User, MapPin, Zap, Loader2, History, TrendingUp, BarChart3, UtensilsCrossed,
  Calendar, Users, Sparkles, Shirt
} from 'lucide-react';
import { toast } from 'sonner';

interface QRRequestDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QRRequestDrawer({ open, onOpenChange }: QRRequestDrawerProps) {
  const { requests, isLoading, updateRequestStatus } = useStaffRequests();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  
  const { messages, requestContext, sendMessage, isSending } = useStaffChat(selectedRequest?.id);
  
  const { stats: historyStats, isLoading: historyLoading } = useRequestHistory(
    selectedRequest?.room_id || null,
    selectedRequest?.metadata?.guest_name || null
  );

  // Fetch order details if this is a menu/room service request
  const { data: orderDetails, isLoading: orderLoading } = useOrderDetails(
    (selectedRequest?.service_category === 'digital_menu' || selectedRequest?.service_category === 'room_service') 
      ? selectedRequest?.id 
      : undefined
  );

  // PHASE 7 FIX 3: Ensure proper filtering for drawer tabs
  const pendingRequests = requests.filter(r => r.qr_token && r.status === 'pending');
  const inProgressRequests = requests.filter(r => r.qr_token && (r.status === 'in_progress' || r.status === 'assigned'));

  // PHASE 9: Batch pre-fetch all order/request details using useQueries
  const allRequestIds = [...pendingRequests, ...inProgressRequests].map(r => r.id);
  
  const orderDetailsQueries = useQueries({
    queries: allRequestIds.map(requestId => ({
      queryKey: ['inline-order-details', requestId],
      queryFn: async () => {
        // Try to fetch guest_order by request_id
        const { data: order } = await supabase
          .from('guest_orders')
          .select('*')
          .eq('request_id', requestId)
          .maybeSingle();
        
        if (order) {
          return { requestId, type: 'order', data: order };
        }
        
        // Fallback: fetch request metadata
        const { data: request } = await supabase
          .from('requests')
          .select('*')
          .eq('id', requestId)
          .single();
        
        return { requestId, type: 'request', data: request };
      },
      enabled: !!requestId,
      staleTime: 30000, // Cache for 30 seconds
    })),
  });

  // Create lookup map for quick access
  const orderDetailsMap = Object.fromEntries(
    orderDetailsQueries
      .filter(q => q.data)
      .map(q => [q.data.requestId, q.data])
  );

  useEffect(() => {
    if (open && !selectedRequest && pendingRequests.length > 0) {
      setSelectedRequest(pendingRequests[0]);
    }
  }, [open, pendingRequests.length]);

  const handleQuickReply = async (template: string) => {
    if (!selectedRequest) return;
    
    try {
      const success = await sendMessage(template);
      if (success) {
        await updateRequestStatus(selectedRequest.id, 'in_progress');
        toast.success('Reply sent successfully');
        setCustomMessage('');
      }
    } catch (error) {
      toast.error('Failed to send reply');
    }
  };

  const handleCustomReply = async () => {
    if (!customMessage.trim() || !selectedRequest) return;
    
    try {
      const success = await sendMessage(customMessage);
      if (success) {
        toast.success('Message sent');
        setCustomMessage('');
      }
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const getQuickReplyTemplates = (serviceCategory: string) => {
    const templates: Record<string, string[]> = {
      room_service: [
        "Your order is being prepared and will arrive shortly.",
        "Your meal will be delivered in 15-20 minutes.",
      ],
      housekeeping: [
        "Housekeeping has been dispatched to your room.",
        "Your room will be serviced within 30 minutes.",
      ],
      maintenance: [
        "Maintenance team has been notified and will attend shortly.",
        "Our technician will be there within 15 minutes.",
      ],
      concierge: [
        "Our concierge team will contact you shortly.",
        "We're looking into your request and will respond soon.",
      ],
      laundry: [
        "Laundry team has been notified of your request.",
        "Your laundry will be collected shortly.",
      ],
      spa: [
        "Your spa booking has been confirmed.",
        "Our spa team will contact you to confirm timing.",
      ],
      digital_menu: [
        "Your order has been received.",
        "Kitchen is preparing your order.",
      ]
    };
    
    return templates[serviceCategory] || [
      "We've received your request and are processing it.",
      "Staff has been notified of your request.",
    ];
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { icon: any; variant: any; label: string }> = {
      pending: { icon: Clock, variant: 'secondary', label: 'Pending' },
      in_progress: { icon: AlertCircle, variant: 'default', label: 'In Progress' },
      completed: { icon: CheckCircle2, variant: 'default', label: 'Completed' },
      cancelled: { icon: XCircle, variant: 'destructive', label: 'Cancelled' }
    };
    return configs[status] || configs.pending;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            QR Portal Requests
            <Badge variant="secondary">{requests.length}</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/3 border-r flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="w-full rounded-none border-b">
                <TabsTrigger value="pending" className="flex-1">
                  Pending <Badge variant="secondary" className="ml-1">{pendingRequests.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="active" className="flex-1">
                  Active <Badge variant="secondary" className="ml-1">{inProgressRequests.length}</Badge>
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1">
                <TabsContent value="pending" className="mt-0 space-y-1 p-2">
                  {pendingRequests.map((req) => (
                    <RequestCard
                      key={req.id}
                      request={req}
                      isSelected={selectedRequest?.id === req.id}
                      onClick={() => setSelectedRequest(req)}
                      orderDetails={orderDetailsMap[req.id]}
                    />
                  ))}
                  {pendingRequests.length === 0 && (
                    <div className="text-center text-muted-foreground py-8 text-sm">
                      No pending requests
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="active" className="mt-0 space-y-1 p-2">
                  {inProgressRequests.map((req) => (
                    <RequestCard
                      key={req.id}
                      request={req}
                      isSelected={selectedRequest?.id === req.id}
                      onClick={() => setSelectedRequest(req)}
                      orderDetails={orderDetailsMap[req.id]}
                    />
                  ))}
                  {inProgressRequests.length === 0 && (
                    <div className="text-center text-muted-foreground py-8 text-sm">
                      No active requests
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>

          <div className="flex-1 flex flex-col">
            {selectedRequest ? (
              <>
                <div className="p-4 border-b space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg capitalize">
                        {selectedRequest.service_category?.replace('_', ' ')}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(selectedRequest.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <Badge variant={getStatusConfig(selectedRequest.status).variant}>
                      {getStatusConfig(selectedRequest.status).label}
                    </Badge>
                  </div>

                  {selectedRequest.note && (
                    <div className="bg-muted p-3 rounded-lg text-sm">
                      <p className="font-medium mb-1">Guest Note:</p>
                      <p>{selectedRequest.note}</p>
                    </div>
                  )}

                  {/* Order Details Section */}
                  {(selectedRequest.service_category === 'digital_menu' || selectedRequest.service_category === 'room_service') && (
                    <div className="mt-3">
                      {orderLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : orderDetails && orderDetails.type === 'order' ? (() => {
                        const orderData = orderDetails.data as any;
                        return (
                          <div className="border border-border rounded-lg p-3 space-y-3">
                            <div className="flex items-center gap-2">
                              <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold text-sm">Order Details</span>
                              <Badge variant="outline" className="ml-auto">
                                Order #{orderData.id.slice(0, 8)}
                              </Badge>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                              {(orderData.items as any[])?.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-start text-sm">
                                  <div className="flex-1">
                                    <p className="font-medium">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                                  </div>
                                  <p className="font-semibold">
                                    ₦{(item.price * item.quantity).toFixed(2)}
                                  </p>
                                </div>
                              ))}
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center">
                              <span className="font-bold">Total:</span>
                              <span className="font-bold text-lg text-primary">
                                ₦{orderData.total?.toFixed(2)}
                              </span>
                            </div>
                            {orderData.special_instructions && (
                              <>
                                <Separator />
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Special Instructions:</p>
                                  <p className="text-sm">{orderData.special_instructions}</p>
                                </div>
                              </>
                            )}
                            
                            {/* Payment Collection Button */}
                            {selectedRequest.metadata?.payment_info?.billable && (
                              <>
                                <Separator />
                                <Button 
                                  className="w-full gap-2" 
                                  variant="default"
                                  onClick={() => {
                                    toast.success('Payment collection interface would open here');
                                    // TODO: Integrate with actual payment system
                                  }}
                                >
                                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                                    <line x1="1" y1="10" x2="23" y2="10"/>
                                  </svg>
                                  Collect Payment (₦{orderData.total?.toLocaleString()})
                                </Button>
                              </>
                            )}
                          </div>
                        );
                      })() : (
                        <div className="text-xs text-muted-foreground text-center py-2">
                          No order details found
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm mt-3">
                    {selectedRequest.metadata?.guest_name && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span>{selectedRequest.metadata.guest_name}</span>
                      </div>
                    )}
                    {selectedRequest.room?.number && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span>Room {selectedRequest.room.number}</span>
                      </div>
                    )}
                  </div>
                </div>

                {historyStats && historyStats.totalRequests > 1 && (
                  <div className="p-4 border-b bg-muted/30">
                    <div className="flex items-center gap-2 mb-3">
                      <History className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs font-medium text-muted-foreground">
                        Request History {selectedRequest.room?.number ? `(Room ${selectedRequest.room.number})` : ''}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="bg-background rounded-lg p-2 text-center">
                        <p className="text-lg font-bold">{historyStats.totalRequests}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                      <div className="bg-background rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-green-600">{historyStats.completedRequests}</p>
                        <p className="text-xs text-muted-foreground">Completed</p>
                      </div>
                      <div className="bg-background rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-blue-600">{historyStats.averageResponseTime}m</p>
                        <p className="text-xs text-muted-foreground">Avg Time</p>
                      </div>
                    </div>

                    {historyStats.commonCategories.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 mb-1">
                          <BarChart3 className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Common Requests:</p>
                        </div>
                        {historyStats.commonCategories.map((cat) => (
                          <div key={cat.category} className="flex items-center justify-between text-xs">
                            <span className="capitalize">{cat.category.replace('_', ' ')}</span>
                            <Badge variant="secondary" className="h-5">{cat.count}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="p-4">
                  <RequestPaymentInfo request={selectedRequest} />
                </div>

                {selectedRequest.status !== 'completed' && (
                  <div className="p-4 border-b">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Quick Replies</p>
                    <div className="flex flex-wrap gap-2">
                      {getQuickReplyTemplates(selectedRequest.service_category).map((template, idx) => (
                        <Button
                          key={idx}
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickReply(template)}
                          disabled={isSending}
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          {template.substring(0, 30)}{template.length > 30 ? '...' : ''}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <ScrollArea className="flex-1 p-4">
                  {requestContext && (
                    <div className="mb-4 p-3 bg-muted/50 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium capitalize">
                            {requestContext.service_category.replace('_', ' ')}
                          </p>
                          {requestContext.room && (
                            <p className="text-xs text-muted-foreground">
                              Room {requestContext.room.number}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {requestContext.status}
                        </Badge>
                      </div>
                      {requestContext.priority && (
                        <Badge variant="secondary" className="text-xs">
                          {requestContext.priority} priority
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-3 py-2 ${
                            msg.direction === 'outbound'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {format(new Date(msg.created_at), 'h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {selectedRequest.status !== 'completed' && (
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type a custom message..."
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleCustomReply();
                          }
                        }}
                        className="min-h-[60px]"
                      />
                      <Button
                        onClick={handleCustomReply}
                        disabled={!customMessage.trim() || isSending}
                        size="icon"
                        className="h-[60px] w-[60px]"
                      >
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                {selectedRequest.status !== 'completed' && (
                  <div className="p-4 border-t flex gap-2">
                    {selectedRequest.status === 'pending' && (
                      <Button
                        onClick={() => updateRequestStatus(selectedRequest.id, 'in_progress')}
                        className="flex-1"
                      >
                        Start Handling
                      </Button>
                    )}
                    {selectedRequest.status === 'in_progress' && (
                      <Button
                        onClick={() => updateRequestStatus(selectedRequest.id, 'completed')}
                        className="flex-1"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Mark Completed
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => updateRequestStatus(selectedRequest.id, 'cancelled')}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a request to view details
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function RequestCard({ request, isSelected, onClick, orderDetails }: any) {
  const config = {
    pending: { icon: Clock, color: 'text-yellow-500' },
    in_progress: { icon: AlertCircle, color: 'text-blue-500' },
    completed: { icon: CheckCircle2, color: 'text-green-500' },
  }[request.status] || { icon: Clock, color: 'text-muted-foreground' };

  const Icon = config.icon;

  // Render service-specific context preview
  const renderContextPreview = () => {
    if (!orderDetails) {
      return (
        <p className="text-xs text-muted-foreground truncate mt-2">
          {request.note || 'No details provided'}
        </p>
      );
    }

    // Menu/Room Service Orders - show items
    if (orderDetails.type === 'order') {
      const orderData = orderDetails.data as any;
      const items = orderData.items as any[];
      
      if (!items || items.length === 0) {
        return <p className="text-xs text-muted-foreground truncate mt-2">Order details loading...</p>;
      }

      const totalItems = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
      
      return (
        <div className="space-y-1 mt-2 p-2 bg-background/50 rounded border border-primary/10">
          <div className="flex items-center gap-2 mb-1">
            <UtensilsCrossed className="h-3 w-3 text-primary" />
            <p className="text-xs font-medium">
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </p>
          </div>
          {items.slice(0, 2).map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground truncate flex-1">
                {item.quantity}× {item.name}
              </span>
              <span className="font-medium ml-2">₦{(item.price * item.quantity).toLocaleString()}</span>
            </div>
          ))}
          {items.length > 2 && (
            <p className="text-xs text-muted-foreground">
              +{items.length - 2} more item{items.length - 2 > 1 ? 's' : ''}...
            </p>
          )}
          <div className="flex justify-between items-center text-xs font-bold pt-1 border-t border-primary/10">
            <span>Total:</span>
            <span className="text-primary">₦{orderData.total?.toLocaleString()}</span>
          </div>
        </div>
      );
    }

    // Request-based services - show metadata
    if (orderDetails.type === 'request') {
      const reqData = orderDetails.data;
      const meta = reqData.metadata || {};

      switch (reqData.service_category) {
        case 'spa':
          return (
            <div className="space-y-1 mt-2 p-2 bg-purple-500/5 rounded border border-purple-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-3 w-3 text-purple-600" />
                <p className="text-xs font-medium">{meta.service_name || 'Spa Service'}</p>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {meta.duration || 'N/A'}
                </span>
                <span className="font-bold text-primary">
                  {meta.currency || 'NGN'} {meta.price?.toLocaleString() || 0}
                </span>
              </div>
              {meta.preferred_datetime && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 border-t border-purple-500/10">
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(meta.preferred_datetime as string), 'MMM d, h:mm a')}</span>
                </div>
              )}
            </div>
          );

        case 'laundry':
          const laundryItems = meta.items || [];
          const totalLaundryItems = laundryItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
          
          return (
            <div className="space-y-1 mt-2 p-2 bg-blue-500/5 rounded border border-blue-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Shirt className="h-3 w-3 text-blue-600" />
                <p className="text-xs font-medium">{totalLaundryItems} laundry items</p>
              </div>
              {laundryItems.slice(0, 2).map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="text-muted-foreground truncate flex-1">
                    {item.quantity}× {item.item_name}
                  </span>
                  <span className="text-xs text-muted-foreground">({item.service_type.replace('_', ' ')})</span>
                </div>
              ))}
              {laundryItems.length > 2 && (
                <p className="text-xs text-muted-foreground">+{laundryItems.length - 2} more...</p>
              )}
              <div className="flex justify-between text-xs font-bold pt-1 border-t border-blue-500/10">
                <span>Total:</span>
                <span className="text-primary">{meta.currency || 'NGN'} {meta.total?.toLocaleString() || 0}</span>
              </div>
            </div>
          );

        case 'dining_reservation':
          return (
            <div className="space-y-1 mt-2 p-2 bg-orange-500/5 rounded border border-orange-500/20">
              <div className="flex items-center gap-2 mb-1">
                <UtensilsCrossed className="h-3 w-3 text-orange-600" />
                <p className="text-xs font-medium">Table Reservation</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground truncate">{meta.reservation_date}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{meta.reservation_time}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs pt-1 border-t border-orange-500/10">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{meta.number_of_guests} guests</span>
              </div>
            </div>
          );

        default:
          return (
            <p className="text-xs text-muted-foreground truncate mt-2">
              {reqData.note || 'No details provided'}
            </p>
          );
      }
    }

    return null;
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        isSelected ? 'bg-accent border-accent-foreground' : 'hover:bg-muted border-transparent'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-xs">
              {request.service_category?.replace('_', ' ')}
            </Badge>
            <Icon className={`h-3 w-3 ${config.color}`} />
          </div>
          <p className="text-xs text-muted-foreground">
            {format(new Date(request.created_at), 'MMM d, h:mm a')}
          </p>
        </div>
        {request.room?.number && (
          <Badge variant="outline" className="text-xs">
            Room {request.room.number}
          </Badge>
        )}
      </div>

      {/* Service-Specific Context Preview */}
      {renderContextPreview()}
    </button>
  );
}
