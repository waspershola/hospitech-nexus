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
import { format } from 'date-fns';
import { 
  MessageSquare, Clock, CheckCircle2, XCircle, AlertCircle, Send,
  User, MapPin, Zap, Loader2, History, TrendingUp, BarChart3
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
  
  const { messages, sendMessage, isSending } = useStaffChat(selectedRequest?.id);
  
  const { stats: historyStats, isLoading: historyLoading } = useRequestHistory(
    selectedRequest?.room_id || null,
    selectedRequest?.metadata?.guest_name || null
  );

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const inProgressRequests = requests.filter(r => r.status === 'in_progress');

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

                  <div className="flex items-center gap-4 text-sm">
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

function RequestCard({ request, isSelected, onClick }: any) {
  const config = {
    pending: { icon: Clock, color: 'text-yellow-500' },
    in_progress: { icon: AlertCircle, color: 'text-blue-500' },
    completed: { icon: CheckCircle2, color: 'text-green-500' },
  }[request.status] || { icon: Clock, color: 'text-muted-foreground' };

  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        isSelected ? 'bg-accent border-accent-foreground' : 'hover:bg-muted border-transparent'
      }`}
    >
      <div className="flex items-start justify-between mb-1">
        <span className="font-medium text-sm capitalize">
          {request.service_category?.replace('_', ' ')}
        </span>
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>
      <p className="text-xs text-muted-foreground truncate">
        {request.note || 'No details provided'}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        {format(new Date(request.created_at), 'h:mm a')}
      </p>
    </button>
  );
}
