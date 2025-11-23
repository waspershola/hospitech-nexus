import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { subscribeToStatusUpdates } from '@/lib/qr/statusBroadcast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { generateRequestReference } from '@/lib/qr/requestReference';
import { useStaffRequests } from '@/hooks/useStaffRequests';
import { useStaffChat } from '@/hooks/useStaffChat';
import { useRequestHistory } from '@/hooks/useRequestHistory';
import { useOrderDetails } from '@/hooks/useOrderDetails';
import { useDashboardDefaults } from '@/hooks/useDashboardDefaults';
import { useFinanceLocations } from '@/hooks/useFinanceLocations';
import { useFinanceProviders } from '@/hooks/useFinanceProviders';
import { usePlatformFee } from '@/hooks/usePlatformFee';
import { calculateQRPlatformFee } from '@/lib/finance/platformFee';
import { useAuth } from '@/contexts/AuthContext';
import { useOverdueRequests } from '@/hooks/useOverdueRequests';
import { RequestPaymentInfo } from './RequestPaymentInfo';
import { RequestCardSkeleton } from './RequestCardSkeleton';
import { PaymentHistoryTimeline } from './PaymentHistoryTimeline';
import { RequestActivityTimeline } from './RequestActivityTimeline';
import { ActivityTimeline } from './ActivityTimeline';
import { RequestFolioLink } from '@/components/staff/RequestFolioLink';
import { format } from 'date-fns';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  MessageSquare, Clock, CheckCircle2, XCircle, AlertCircle, Send,
  User, MapPin, Zap, Loader2, History, TrendingUp, BarChart3, UtensilsCrossed,
  Calendar, Users, Sparkles, Shirt, DollarSign, Wifi, Phone, CreditCard, Shield, ShieldAlert, Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { ConnectionHealthIndicator } from '@/components/ui/ConnectionHealthIndicator';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface QRRequestDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Map service categories to dashboard names for auto-selecting payment location
const SERVICE_TO_DASHBOARD_MAP: Record<string, string> = {
  'digital_menu': 'restaurant',
  'room_service': 'restaurant',
  'spa': 'spa',
  'laundry': 'bar',
  'dining_reservation': 'restaurant',
  'housekeeping': 'front_desk',
  'maintenance': 'front_desk',
  'concierge': 'front_desk',
};

export function QRRequestDrawer({ open, onOpenChange }: QRRequestDrawerProps) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const { requests, isLoading, updateRequestStatus, fetchRequests } = useStaffRequests();
  const { overdueCount, slaMinutes } = useOverdueRequests(); // PHASE-3: SLA tracking
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [isCollectingPayment, setIsCollectingPayment] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [isAdjustingAmount, setIsAdjustingAmount] = useState(false);
  const [quickRepliesOpen, setQuickRepliesOpen] = useState(() => {
    const saved = localStorage.getItem('qr-quick-replies-open');
    return saved !== null ? JSON.parse(saved) : false;
  });
  
  const { messages, requestContext, sendMessage, isSending } = useStaffChat(selectedRequest?.id);
  
  const { stats: historyStats, isLoading: historyLoading } = useRequestHistory(
    selectedRequest?.room_id || null,
    selectedRequest?.metadata?.guest_name || null
  );

  // Fetch finance data for payment collection
  const { getDefaultLocation } = useDashboardDefaults();
  const { locations } = useFinanceLocations();
  const { providers } = useFinanceProviders();
  const { data: platformFeeConfig } = usePlatformFee(tenantId);

  // Fetch order details if this is a menu/room service request
  const { data: orderDetails, isLoading: orderLoading } = useOrderDetails(
    (selectedRequest?.type === 'digital_menu' || 
     selectedRequest?.type === 'menu_order' || 
     selectedRequest?.type === 'room_service') 
      ? selectedRequest?.id 
      : undefined
  );

  // PHASE 7 FIX 3: Ensure proper filtering for drawer tabs
  const pendingRequests = requests.filter(r => r.qr_token && r.status === 'pending');
  const inProgressRequests = requests.filter(r => r.qr_token && (r.status === 'in_progress' || r.status === 'assigned'));

  // PHASE-3: Filter overdue requests (pending/in_progress, not responded, older than SLA)
  const overdueThreshold = new Date();
  overdueThreshold.setMinutes(overdueThreshold.getMinutes() - slaMinutes);
  
  const overdueRequests = requests.filter(r => {
    return r.qr_token &&
           ['pending', 'in_progress'].includes(r.status) &&
           !r.responded_at &&
           new Date(r.created_at) < overdueThreshold;
  });

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
        .eq('tenant_id', tenantId) // PHASE-1B: Prevent cross-tenant data leaks
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

  // Create loading state map
  const loadingStateMap = Object.fromEntries(
    orderDetailsQueries.map((q, idx) => [allRequestIds[idx], q.isLoading])
  );

  // PHASE-2A-COMPLETE: Force refetch when drawer opens + aggressive polling
  useEffect(() => {
    if (open) {
      console.log('[QRRequestDrawer] PHASE-2A-COMPLETE: Drawer opened - force refreshing requests');
      fetchRequests();
      
      // Poll every 2 seconds while drawer is open for guaranteed real-time updates
      const pollInterval = setInterval(() => {
        console.log('[QRRequestDrawer] PHASE-2A-POLLING: Refreshing requests');
        fetchRequests();
      }, 2000);
      
      return () => {
        console.log('[QRRequestDrawer] PHASE-2A-POLLING: Clearing poll interval');
        clearInterval(pollInterval);
      };
    }
  }, [open, fetchRequests]);

  useEffect(() => {
    if (open && !selectedRequest && pendingRequests.length > 0) {
      setSelectedRequest(pendingRequests[0]);
    }
    // Clear selection if selected request is completed or cancelled
    if (selectedRequest && ['completed', 'cancelled'].includes(selectedRequest.status)) {
      setSelectedRequest(null);
    }
  }, [open, pendingRequests.length, selectedRequest?.status]);

  useEffect(() => {
    localStorage.setItem('qr-quick-replies-open', JSON.stringify(quickRepliesOpen));
  }, [quickRepliesOpen]);

  // PHASE-2A-V1: Subscribe to cross-tab status updates via BroadcastChannel
  useEffect(() => {
    console.log('[QRRequestDrawer] PHASE-2A-V1: Setting up BroadcastChannel listener');
    
    const unsubscribe = subscribeToStatusUpdates((payload) => {
      console.log('[QRRequestDrawer] PHASE-2A-V1: Received status update from another tab:', payload);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['staff-requests'] });
      queryClient.invalidateQueries({ queryKey: ['qr-requests'] });
    });

    return () => {
      console.log('[QRRequestDrawer] PHASE-2A-V1: Cleaning up BroadcastChannel listener');
      unsubscribe();
    };
  }, [queryClient]);

  // Auto-select payment location based on service category
  useEffect(() => {
    if (selectedRequest && !selectedLocationId) {
      const serviceCategory = selectedRequest.type;
      const dashboardName = SERVICE_TO_DASHBOARD_MAP[serviceCategory];
      if (dashboardName) {
        const defaultLocationId = getDefaultLocation(dashboardName);
        if (defaultLocationId) {
          setSelectedLocationId(defaultLocationId);
        }
      }
    }
  }, [selectedRequest, selectedLocationId, getDefaultLocation]);

  // Reset payment selections when request changes
  useEffect(() => {
    if (selectedRequest) {
      setSelectedLocationId(null);
      setSelectedProviderId(null);
    }
  }, [selectedRequest?.id]);

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

  const handleAdjustAmount = async () => {
    if (!selectedRequest || !adjustmentAmount) {
      toast.error('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(adjustmentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid positive amount');
      return;
    }

    setIsAdjustingAmount(true);
    try {
      const { error } = await supabase
        .from('requests')
        .update({
          metadata: {
            ...selectedRequest.metadata,
            payment_info: {
              ...selectedRequest.metadata?.payment_info,
              amount,
              adjusted_at: new Date().toISOString(),
            },
          },
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast.success(`Amount set to ₦${amount.toLocaleString()}`);
      
      // Update local state
      setSelectedRequest({
        ...selectedRequest,
        metadata: {
          ...selectedRequest.metadata,
          payment_info: {
            ...selectedRequest.metadata?.payment_info,
            amount,
            adjusted_at: new Date().toISOString(),
          },
        },
      });
      
      setAdjustmentAmount('');
    } catch (error) {
      console.error('Amount adjustment error:', error);
      toast.error('Failed to adjust amount');
    } finally {
      setIsAdjustingAmount(false);
    }
  };

  // PHASE 1.2: Validate guest phone before charging to room
  const validateGuestPhone = async (folioId: string, guestPhone?: string) => {
    if (!guestPhone) {
      console.warn('[FRAUD-PREVENTION-V1] No guest phone provided for validation');
      return { valid: false, reason: 'No phone number provided', guestName: null };
    }
    
    const { data: folio, error } = await supabase
      .from('stay_folios')
      .select('guest:guests(phone, name)')
      .eq('id', folioId)
      .eq('tenant_id', tenantId)
      .single();
      
    if (error || !folio) {
      return { valid: false, reason: 'Unable to verify folio guest', guestName: null };
    }
    
    const checkedInPhone = folio.guest?.phone;
    const phoneMatches = checkedInPhone === guestPhone;
    
    console.log('[FRAUD-PREVENTION-V1] Phone validation:', {
      provided: guestPhone,
      checkedIn: checkedInPhone,
      matches: phoneMatches
    });
    
    return {
      valid: phoneMatches,
      reason: phoneMatches ? 'Verified' : 'Phone mismatch - guest identity not confirmed',
      guestName: folio.guest?.name
    };
  };

  // PHASE 1.5: Log staff activity (using raw SQL until types refresh)
  const logActivity = async (actionType: string, metadata: any = {}) => {
    if (!selectedRequest) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    
    try {
      const { error } = await supabase.rpc('log_request_activity' as any, {
        p_tenant_id: tenantId,
        p_request_id: selectedRequest.id,
        p_staff_id: user?.id,
        p_action_type: actionType,
        p_metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          request_type: selectedRequest.type
        }
      });
      
      if (!error) {
        console.log('[ACTIVITY-LOG-V1] Logged:', actionType);
      }
    } catch (error) {
      console.error('[ACTIVITY-LOG-V1] Failed to log activity:', error);
    }
  };

  // Charge to room handler with FRAUD PREVENTION
  const handleChargeToRoom = async () => {
    if (!selectedRequest) return;
    
    if (isCollectingPayment) {
      console.log('[Charge to Room Idempotency] Charge already in progress, ignoring duplicate click');
      return;
    }
    
    const amount = selectedRequest.metadata?.payment_info?.amount;
    
    if (!amount || amount <= 0) {
      toast.error('Invalid charge amount');
      return;
    }

    if (!selectedRequest.stay_folio_id) {
      toast.error('No active folio found. Guest must be checked in to charge to room.');
      return;
    }

    // PHASE 1.2: FRAUD PREVENTION - Validate phone BEFORE charging
    const guestPhone = selectedRequest.metadata?.guest_contact;
    const validation = await validateGuestPhone(selectedRequest.stay_folio_id, guestPhone);
    
    if (!validation.valid) {
      await logActivity('phone_mismatch', { 
        reason: validation.reason,
        provided_phone: guestPhone
      });
      
      toast.error(`Cannot charge to room: ${validation.reason}`, {
        description: 'Verify guest identity before charging.',
        duration: 8000
      });
      return;
    }
    
    await logActivity('phone_verified', { guest_name: validation.guestName });

    setIsCollectingPayment(true);
    console.log('[Charge to Room] FRAUD-SAFE-V1 - Phone verified, charging to folio:', {
      request_id: selectedRequest.id,
      folio_id: selectedRequest.stay_folio_id,
      amount,
    });

    try {
      const { data, error } = await supabase.functions.invoke('qr-auto-folio-post', {
        body: {
          request_id: selectedRequest.id,
          tenant_id: tenantId,
          amount,
          type: selectedRequest.type,
          description: `${selectedRequest.type} - QR Request`,
        },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to charge to room');
      }

      await logActivity('charged_to_folio', { amount, folio_number: data.folio_number });

      toast.success(`₦${amount.toLocaleString()} charged to folio ${data.folio_number}`);
      
      queryClient.invalidateQueries({ queryKey: ['staff-requests'] });
      queryClient.invalidateQueries({ queryKey: ['folio-by-id', selectedRequest.stay_folio_id] });
      queryClient.invalidateQueries({ queryKey: ['booking-folio'] });
      
      onOpenChange(false);
    } catch (error: any) {
      console.error('[Charge to Room] Error:', error);
      toast.error(error.message || 'Failed to charge to room');
    } finally {
      setIsCollectingPayment(false);
    }
  };

  // Universal payment handler for all service types with auto-folio posting
  const handleCollectPaymentForService = async () => {
    if (!selectedRequest) return;
    
    if (!selectedLocationId || !selectedProviderId) {
      toast.error('Please select payment location and method');
      return;
    }
    
    // PHASE-4-IDEMPOTENCY-V1: Prevent double-click submissions
    if (isCollectingPayment) {
      console.log('[Payment Idempotency] Payment already in progress, ignoring duplicate click');
      return;
    }
    
    setIsCollectingPayment(true);
    
    // Enhanced logging for debugging payment issues
    console.log('[Payment Collection] QR-PAYMENT-AUTO-FOLIO-V1 - Starting payment collection:', {
      request_id: selectedRequest.id,
      type: selectedRequest.type,
      location_id: selectedLocationId,
      provider_id: selectedProviderId,
      payment_info: selectedRequest.metadata?.payment_info,
      has_folio: !!selectedRequest.stay_folio_id,
    });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('[Payment Collection] No authenticated user found');
        toast.error('Authentication required to collect payment');
        return;
      }
      
      // Fetch location and provider details for display
      const selectedLocation = locations.find(l => l.id === selectedLocationId);
      const selectedProvider = providers.find(p => p.id === selectedProviderId);
      
      if (!selectedLocation || !selectedProvider) {
        console.error('[Payment Collection] Location or provider not found:', {
          selectedLocation,
          selectedProvider,
        });
        toast.error('Invalid payment location or method selected');
        return;
      }
      
      const amount = selectedRequest.metadata?.payment_info?.amount;
      const currency = selectedRequest.metadata?.payment_info?.currency || 'NGN';
      
      if (!amount || amount <= 0) {
        console.error('[Payment Collection] Invalid payment amount:', { amount });
        toast.error('Invalid payment amount');
        return;
      }
      
      console.log('[Payment Collection] Payment details validated:', {
        amount,
        currency,
        location: selectedLocation.name,
        provider: selectedProvider.name,
        user_id: user.id,
      });
      
      // Update payment metadata with location and provider info
      const { error: updateError } = await supabase
        .from('requests')
        .update({
          metadata: {
            ...selectedRequest.metadata,
            payment_info: {
              ...selectedRequest.metadata?.payment_info,
              status: 'paid',
              collected_at: new Date().toISOString(),
              collected_by: user?.id,
              amount,
              currency,
              location_id: selectedLocationId,
              location_name: selectedLocation?.name,
              provider_id: selectedProviderId,
              provider_name: selectedProvider?.name,
              provider_type: selectedProvider?.type,
            }
          }
        })
        .eq('id', selectedRequest.id);

      if (updateError) {
        console.error('[Payment Collection] Failed to update payment status:', {
          error: updateError,
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
        });
        throw updateError;
      }
      
      console.log('[Payment Collection] Payment metadata updated successfully');

      // Send payment confirmation message to guest
      const serviceName = selectedRequest.type?.replace('_', ' ').toUpperCase();
      
      // For menu/room service orders, include item details
      let receiptMessage = `✅ Payment Received\n\n${serviceName} Payment`;
      
      if (orderDetails && orderDetails.type === 'order') {
        const orderData = orderDetails.data as any;
        const items = orderData.items || [];
        const itemsList = items
          .map((item: any) => `• ${item.quantity}× ${item.name} - ₦${(item.price * item.quantity).toLocaleString()}`)
          .join('\n');
        receiptMessage = `✅ Payment Received\n\n${itemsList}\n\n━━━━━━━━━━━━━━━`;
      }
      
      receiptMessage += `\nTotal Paid: ${currency === 'NGN' ? '₦' : currency}${amount?.toLocaleString()}\nPayment Location: ${selectedLocation?.name}\nPayment Method: ${selectedProvider?.name} (${selectedProvider?.type?.toUpperCase()})\nDate: ${new Date().toLocaleString()}\n\nThank you for your payment! Your receipt has been recorded.`;

      const { error: messageError } = await supabase
        .from('guest_communications')
        .insert({
          tenant_id: selectedRequest.tenant_id,
          guest_id: null,
          request_id: selectedRequest.id,
          type: 'message',
          direction: 'outbound',
          message: receiptMessage,
          status: 'sent',
          metadata: {
            qr_token: selectedRequest.qr_token,
            is_payment_confirmation: true,
            payment_amount: amount,
            payment_currency: currency,
          },
        });

      if (messageError) {
        console.error('[Payment Collection] Failed to send confirmation message:', {
          error: messageError,
          message: messageError.message,
          code: messageError.code,
        });
        console.warn('[Payment Collection] Payment collected but confirmation message failed to send');
      } else {
        console.log('[Payment Collection] Confirmation message sent successfully');
      }

      console.log('[Payment Collection] Payment collection completed successfully');

      // PHASE-4-IDEMPOTENCY-V1: Check if payment already exists for this request
      const existingTransactionRef = selectedRequest.metadata?.payment_info?.transaction_ref;
      
      if (existingTransactionRef) {
        console.log('[Payment Idempotency] Checking for existing payment with ref:', existingTransactionRef);
        
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id, status, amount')
          .eq('transaction_ref', existingTransactionRef)
          .eq('tenant_id', selectedRequest.tenant_id)
          .maybeSingle();
        
        if (existingPayment) {
          console.log('[Payment Idempotency] Payment already exists:', existingPayment);
          toast.info('Payment already recorded for this request');
          
          // Invalidate queries and close drawer
          queryClient.invalidateQueries({ queryKey: ['staff-requests'] });
          queryClient.invalidateQueries({ queryKey: ['folio-by-id', selectedRequest.stay_folio_id] });
          onOpenChange(false);
          return;
        }
      }
      
      // Post payment to folio if request is linked to a folio
      if (selectedRequest.stay_folio_id) {
        console.log('[Payment Collection] Posting payment to folio:', selectedRequest.stay_folio_id);
        
        try {
          // Use stored transaction_ref for idempotency (generated at request creation)
          const transactionRef = existingTransactionRef || `QR-${selectedRequest.id.slice(0, 8)}-${Date.now()}`;
          console.log('[Payment Collection] Using transaction_ref:', transactionRef);
          
          // First create the payment record with idempotent transaction_ref
          const { data: paymentRecord, error: paymentInsertError } = await supabase
            .from('payments')
            .insert({
              tenant_id: selectedRequest.tenant_id,
              booking_id: selectedRequest.metadata?.booking_id || null,
              guest_id: selectedRequest.guest_id,
              amount: amount,
              expected_amount: amount,
              currency: currency,
              method: selectedProvider.type,
              payment_type: 'service',
              status: 'completed',
              transaction_ref: transactionRef,
              recorded_by: user.id,
              department: selectedRequest.assigned_department || selectedRequest.type,
              location_id: selectedLocationId,
              provider_id: selectedProviderId,
              stay_folio_id: selectedRequest.stay_folio_id,
              metadata: {
                request_id: selectedRequest.id,
                type: selectedRequest.type,
                qr_payment: true
              }
            })
            .select()
            .single();

          if (paymentInsertError) {
            console.error('[Payment Collection] Failed to create payment record:', paymentInsertError);
          } else if (paymentRecord) {
            console.log('[Payment Collection] Payment record created:', paymentRecord.id);
            
            // Post payment to folio
            const { data: folioResult, error: folioError } = await supabase.rpc('folio_post_payment', {
              p_folio_id: selectedRequest.stay_folio_id,
              p_payment_id: paymentRecord.id,
              p_amount: amount
            });

            if (folioError) {
              console.error('[Payment Collection] Failed to post to folio:', folioError);
            } else {
              console.log('[Payment Collection] Posted to folio successfully:', folioResult);
            }
          }
        } catch (folioError) {
          console.error('[Payment Collection] Folio posting error (non-blocking):', folioError);
        }
      }

      // Record platform fee in ledger (non-blocking)
      try {
        await supabase.functions.invoke('record-platform-fee', {
          body: {
            request_id: selectedRequest.id,
            tenant_id: selectedRequest.tenant_id,
            type: selectedRequest.type,
            amount: amount,
            payment_location: selectedLocation?.name,
            payment_method: selectedProvider?.name,
          },
        });
        console.log('[Payment Collection] Platform fee recorded successfully');
      } catch (feeError) {
        console.error('[Payment Collection] Platform fee recording error (non-blocking):', feeError);
        // Don't fail payment collection if fee recording fails
      }
      
      toast.success(`Payment of ${currency === 'NGN' ? '₦' : currency}${amount?.toLocaleString()} collected successfully!`);
      
      // Update local state
      setSelectedRequest({ 
        ...selectedRequest, 
        metadata: { 
          ...selectedRequest.metadata, 
          payment_info: { 
            ...selectedRequest.metadata?.payment_info,
            status: 'paid',
            location_id: selectedLocationId,
            location_name: selectedLocation?.name,
            provider_id: selectedProviderId,
            provider_name: selectedProvider?.name,
            provider_type: selectedProvider?.type,
          } 
        } 
      });
      
      // Invalidate platform fee queries to refresh ledger
      queryClient.invalidateQueries({ queryKey: ['platform-fee-config'] });
      queryClient.invalidateQueries({ queryKey: ['platform-fee-ledger'] });
    } catch (error) {
      console.error('Payment collection error:', error);
      toast.error('Failed to collect payment');
    } finally {
      setIsCollectingPayment(false);
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
            <div className="ml-auto">
              <ConnectionHealthIndicator showLabel />
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/3 border-r flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="w-full rounded-none border-b">
                <TabsTrigger value="pending" className="flex-1">
                  Pending <Badge variant="secondary" className="ml-1">{pendingRequests.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="overdue" className="flex-1 text-destructive data-[state=active]:text-destructive">
                  Overdue <Badge variant="destructive" className="ml-1">{overdueCount}</Badge>
                </TabsTrigger>
                <TabsTrigger value="active" className="flex-1">
                  Active <Badge variant="secondary" className="ml-1">{inProgressRequests.length}</Badge>
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 max-h-[calc(100vh-250px)]">
                <TabsContent value="pending" className="mt-0 space-y-1 p-2">
                  {pendingRequests.map((req) => (
                    <RequestCard
                      key={req.id}
                      request={req}
                      isSelected={selectedRequest?.id === req.id}
                      onClick={() => setSelectedRequest(req)}
                      orderDetails={orderDetailsMap[req.id]}
                      isLoading={loadingStateMap[req.id]}
                    />
                  ))}
                  {pendingRequests.length === 0 && (
                    <div className="text-center text-muted-foreground py-8 text-sm">
                      No pending requests
                    </div>
                  )}
                </TabsContent>

                {/* PHASE-3: Overdue Requests Tab */}
                <TabsContent value="overdue" className="mt-0 space-y-1 p-2">
                  {overdueRequests.map((req) => {
                    // Calculate minutes overdue for display
                    const minutesOverdue = Math.floor(
                      (new Date().getTime() - new Date(req.created_at).getTime()) / (1000 * 60)
                    );
                    
                    return (
                      <div key={req.id} className="relative">
                        {/* Overdue indicator badge */}
                        <div className="absolute top-2 right-2 z-10">
                          <Badge variant="destructive" className="text-xs">
                            Overdue ({minutesOverdue} min)
                          </Badge>
                        </div>
                        <RequestCard
                          request={req}
                          isSelected={selectedRequest?.id === req.id}
                          onClick={() => setSelectedRequest(req)}
                          orderDetails={orderDetailsMap[req.id]}
                          isLoading={loadingStateMap[req.id]}
                        />
                      </div>
                    );
                  })}
                  {overdueRequests.length === 0 && (
                    <div className="text-center text-muted-foreground py-8 text-sm">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p>No overdue requests</p>
                      <p className="text-xs mt-1">All requests are within {slaMinutes}-minute SLA</p>
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
                      isLoading={loadingStateMap[req.id]}
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

          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedRequest ? (
              <>
                {/* FIXED HEADER - Service category and status */}
                <div className="p-4 border-b shrink-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={() => {
                            const ref = generateRequestReference(selectedRequest.id);
                            navigator.clipboard.writeText(ref);
                            toast.success('Reference code copied');
                          }}
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 transition-colors text-xs font-mono text-muted-foreground hover:text-foreground"
                          title="Click to copy reference code"
                        >
                          <span className="font-semibold">{generateRequestReference(selectedRequest.id)}</span>
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                      <h3 className="font-semibold text-lg capitalize">
                        {selectedRequest.type?.replace('_', ' ')}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(selectedRequest.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <Badge variant={getStatusConfig(selectedRequest.status).variant}>
                      {getStatusConfig(selectedRequest.status).label}
                    </Badge>
                  </div>
                </div>

                {/* SCROLLABLE CONTENT AREA - Everything else goes here */}
                <ScrollArea className="flex-1 max-h-[calc(100vh-300px)]">
                  <div className="p-4 space-y-4">
                    {/* Guest Note */}
                    {selectedRequest.note && (
                      <div className="bg-muted p-3 rounded-lg text-sm">
                        <p className="font-medium mb-1">Guest Note:</p>
                        <p>{selectedRequest.note}</p>
                      </div>
                    )}

                    {/* PHASE 1.3: Guest Payment Preference Indicator */}
                    {selectedRequest.metadata?.payment_choice && (
                      <Alert className="border-blue-200 bg-blue-50">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        <AlertDescription>
                          <p className="text-sm font-medium text-blue-900">
                            Guest Payment Preference
                          </p>
                          <p className="text-xs text-blue-700 mt-1">
                            {selectedRequest.metadata.payment_choice === 'bill_to_room' 
                              ? '💳 Bill to Room' 
                              : '💰 Pay Now (via payment providers)'}
                          </p>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Guest Contact & Phone Display */}
                    {selectedRequest.metadata?.guest_contact && (
                      <div className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded-md">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">Guest Phone:</span>
                        <span>{selectedRequest.metadata.guest_contact}</span>
                      </div>
                    )}

                    {/* Guest & Room Info */}
                    {(selectedRequest.metadata?.guest_name || selectedRequest.metadata?.room_number || selectedRequest.room?.number) && (
                      <div className="flex items-center gap-4 text-sm">
                        {selectedRequest.metadata?.guest_name && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span>{selectedRequest.metadata.guest_name}</span>
                          </div>
                        )}
                        {(selectedRequest.metadata?.room_number || selectedRequest.room?.number) && (
                          <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded">
                            <MapPin className="h-3 w-3 text-primary" />
                            <span className="font-medium">{selectedRequest.metadata?.room_number || selectedRequest.room?.number}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Order Details Section */}
                    {(selectedRequest.type === 'digital_menu' || 
                      selectedRequest.type === 'menu_order' || 
                      selectedRequest.type === 'room_service') && (
                      <div>
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
                              <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">Subtotal:</span>
                                  <span>₦{orderData.subtotal?.toFixed(2)}</span>
                                </div>
                                
                                {(() => {
                                  const platformFeeBreakdown = calculateQRPlatformFee(
                                    orderData.subtotal || 0,
                                    platformFeeConfig || null
                                  );
                                  
                                  return platformFeeBreakdown.platformFee > 0 && platformFeeConfig?.payer === 'guest' ? (
                                    <div className="flex justify-between items-center text-sm">
                                      <span className="text-muted-foreground">
                                        Platform Fee {platformFeeConfig.fee_type === 'flat' ? '(Flat)' : `(${platformFeeConfig.qr_fee}%)`}
                                        {' (charged to guest)'}
                                      </span>
                                      <span className="text-muted-foreground">
                                        +₦{platformFeeBreakdown.platformFee.toFixed(2)}
                                      </span>
                                    </div>
                                  ) : null;
                                })()}
                                
                                <div className="flex justify-between items-center font-bold text-base pt-2 border-t">
                                  <span>Total:</span>
                                  <span className="text-lg text-primary">
                                    ₦{orderData.total?.toFixed(2)}
                                  </span>
                                </div>
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
                              
                              {/* Payment Collection Section */}
                              {selectedRequest.metadata?.payment_info?.billable && 
                               selectedRequest.metadata?.payment_info?.status !== 'paid' && (
                                <>
                                  <Separator />
                                  <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">Payment Location</Label>
                                      <Select 
                                        value={selectedLocationId || ''} 
                                        onValueChange={setSelectedLocationId}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select payment location" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {locations
                                            .filter(l => l.status === 'active')
                                            .map(location => (
                                              <SelectItem key={location.id} value={location.id}>
                                                {location.name}
                                                {location.department && ` (${location.department.toUpperCase()})`}
                                              </SelectItem>
                                            ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">Payment Method</Label>
                                      <Select 
                                        value={selectedProviderId || ''} 
                                        onValueChange={setSelectedProviderId}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select payment method" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {providers
                                            .filter(p => p.status === 'active')
                                            .map(provider => (
                                              <SelectItem key={provider.id} value={provider.id}>
                                                {provider.name} ({provider.type.toUpperCase()})
                                              </SelectItem>
                                            ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  
                                  <Button 
                                    className="w-full gap-2" 
                                    variant="default"
                                    onClick={handleCollectPaymentForService}
                                    disabled={isCollectingPayment || !selectedLocationId || !selectedProviderId}
                                  >
                                    {isCollectingPayment ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                                        <line x1="1" y1="10" x2="23" y2="10"/>
                                      </svg>
                                    )}
                                    {isCollectingPayment ? 'Processing...' : `Collect Payment (₦${orderData.total?.toLocaleString()})`}
                                  </Button>
                                </>
                              )}
                              {selectedRequest.metadata?.payment_info?.status === 'paid' && (
                                <div className="space-y-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-600">Payment Collected</span>
                                  </div>
                                  {selectedRequest.metadata.payment_info.location_name && (
                                    <div className="text-xs text-muted-foreground space-y-1">
                                      <div>Location: {selectedRequest.metadata.payment_info.location_name}</div>
                                      <div>Method: {selectedRequest.metadata.payment_info.provider_name} ({selectedRequest.metadata.payment_info.provider_type?.toUpperCase()})</div>
                                      <div>Amount: ₦{selectedRequest.metadata.payment_info.amount?.toLocaleString()}</div>
                                      {selectedRequest.metadata.payment_info.collected_at && (
                                        <div>Collected: {new Date(selectedRequest.metadata.payment_info.collected_at).toLocaleString()}</div>
                                      )}
                                    </div>
                                  )}
                                </div>
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

                    {/* Payment Info */}
                    <RequestPaymentInfo request={selectedRequest} />
                    
                    {/* Folio Link */}
                    <RequestFolioLink request={selectedRequest} />
                    
                    {/* Amount Adjustment for Dining Reservations */}
                    {selectedRequest.type === 'dining_reservation' &&
                     selectedRequest.metadata?.payment_info?.billable &&
                     selectedRequest.metadata?.payment_info?.amount === null &&
                     selectedRequest.metadata?.payment_info?.status !== 'paid' && (
                      <div className="border border-border rounded-lg p-4 space-y-3 bg-amber-500/5">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-amber-600" />
                          <span className="font-semibold text-sm">Set Final Bill Amount</span>
                          <Badge variant="outline" className="ml-auto text-xs">
                            Required before payment
                          </Badge>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <Label htmlFor="amount-adjustment" className="text-sm">
                            Final Bill Amount (₦)
                          </Label>
                          <div className="flex gap-2">
                            <input
                              id="amount-adjustment"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Enter amount"
                              value={adjustmentAmount}
                              onChange={(e) => setAdjustmentAmount(e.target.value)}
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <Button
                              onClick={handleAdjustAmount}
                              disabled={isAdjustingAmount || !adjustmentAmount}
                              className="gap-2"
                            >
                              {isAdjustingAmount ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <DollarSign className="h-4 w-4" />
                              )}
                              {isAdjustingAmount ? 'Setting...' : 'Set Amount'}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Enter the final bill amount after the meal is completed to enable payment collection.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* PHASE 1.4 & 1.5: Payment & Activity History */}
                    <Collapsible defaultOpen={true}>
                      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-md hover:bg-muted">
                        <div className="flex items-center gap-2">
                          <History className="h-4 w-4" />
                          <span className="font-medium">Payment & Activity History</span>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 space-y-3">
                        {/* PHASE-2-ACTIVITY-TIMELINE: Staff action timeline */}
                        <ActivityTimeline 
                          requestId={selectedRequest.id}
                          tenantId={tenantId}
                        />
                        
                        {selectedRequest.metadata?.payment_info && (
                          <PaymentHistoryTimeline 
                            request={selectedRequest}
                            paymentInfo={selectedRequest.metadata.payment_info}
                          />
                        )}
                        {/* Legacy activity timeline */}
                        <RequestActivityTimeline requestId={selectedRequest.id} />
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Payment Collection for Dining Reservations (after amount is set) */}
                    {selectedRequest.type === 'dining_reservation' &&
                     selectedRequest.metadata?.payment_info?.billable &&
                     selectedRequest.metadata?.payment_info?.amount !== null &&
                     selectedRequest.metadata?.payment_info?.status !== 'paid' && (
                      <div className="border border-border rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-sm">Payment Collection</span>
                        </div>
                        <Separator />
                        
                        <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                          <span className="font-medium">Total Bill:</span>
                          <span className="font-bold text-lg text-primary">
                            ₦{selectedRequest.metadata.payment_info.amount?.toLocaleString()}
                          </span>
                        </div>

                        <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Payment Location</Label>
                            <Select 
                              value={selectedLocationId || ''} 
                              onValueChange={setSelectedLocationId}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment location" />
                              </SelectTrigger>
                              <SelectContent>
                                {locations
                                  .filter(l => l.status === 'active')
                                  .map(location => (
                                    <SelectItem key={location.id} value={location.id}>
                                      {location.name}
                                      {location.department && ` (${location.department.toUpperCase()})`}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Payment Method</Label>
                            <Select 
                              value={selectedProviderId || ''} 
                              onValueChange={setSelectedProviderId}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment method" />
                              </SelectTrigger>
                              <SelectContent>
                                {providers
                                  .filter(p => p.status === 'active')
                                  .map(provider => (
                                    <SelectItem key={provider.id} value={provider.id}>
                                      {provider.name} ({provider.type.toUpperCase()})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <Button 
                          className="w-full gap-2" 
                          variant="default"
                          onClick={handleCollectPaymentForService}
                          disabled={isCollectingPayment || !selectedLocationId || !selectedProviderId}
                        >
                          {isCollectingPayment ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                              <line x1="1" y1="10" x2="23" y2="10"/>
                            </svg>
                          )}
                          {isCollectingPayment ? 'Processing...' : `Collect Payment (₦${selectedRequest.metadata.payment_info.amount?.toLocaleString()})`}
                        </Button>
                      </div>
                    )}

                    {/* Payment Collection for Spa Services */}
                    {selectedRequest.type === 'spa' &&
                     selectedRequest.metadata?.payment_info?.billable &&
                     selectedRequest.metadata?.payment_info?.status !== 'paid' && (
                      <div className="border border-border rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-purple-600" />
                          <span className="font-semibold text-sm">Spa Service Payment</span>
                        </div>
                        <Separator />
                        
                        <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                          <span className="font-medium">Service Total:</span>
                          <span className="font-bold text-lg text-primary">
                            ₦{selectedRequest.metadata.payment_info.amount?.toLocaleString()}
                          </span>
                        </div>

                        <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Payment Location</Label>
                            <Select value={selectedLocationId || ''} onValueChange={setSelectedLocationId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment location" />
                              </SelectTrigger>
                              <SelectContent>
                                {locations.filter(l => l.status === 'active').map(location => (
                                  <SelectItem key={location.id} value={location.id}>
                                    {location.name} {location.department && `(${location.department.toUpperCase()})`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Payment Method</Label>
                            <Select value={selectedProviderId || ''} onValueChange={setSelectedProviderId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment method" />
                              </SelectTrigger>
                              <SelectContent>
                                {providers.filter(p => p.status === 'active').map(provider => (
                                  <SelectItem key={provider.id} value={provider.id}>
                                    {provider.name} ({provider.type.toUpperCase()})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <Button 
                          className="w-full gap-2" 
                          variant="default"
                          onClick={handleCollectPaymentForService}
                          disabled={isCollectingPayment || !selectedLocationId || !selectedProviderId}
                        >
                          {isCollectingPayment ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <DollarSign className="h-4 w-4" />
                          )}
                          {isCollectingPayment ? 'Processing...' : `Collect Payment (₦${selectedRequest.metadata.payment_info.amount?.toLocaleString()})`}
                        </Button>
                      </div>
                    )}

                    {/* Payment Collection for Laundry Services */}
                    {selectedRequest.type === 'laundry' &&
                     selectedRequest.metadata?.payment_info?.billable &&
                     selectedRequest.metadata?.payment_info?.status !== 'paid' && (
                      <div className="border border-border rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Shirt className="h-4 w-4 text-blue-600" />
                          <span className="font-semibold text-sm">Laundry Service Payment</span>
                        </div>
                        <Separator />
                        
                        <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                          <span className="font-medium">Service Total:</span>
                          <span className="font-bold text-lg text-primary">
                            ₦{selectedRequest.metadata.payment_info.amount?.toLocaleString()}
                          </span>
                        </div>

                        <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Payment Location</Label>
                            <Select value={selectedLocationId || ''} onValueChange={setSelectedLocationId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment location" />
                              </SelectTrigger>
                              <SelectContent>
                                {locations.filter(l => l.status === 'active').map(location => (
                                  <SelectItem key={location.id} value={location.id}>
                                    {location.name} {location.department && `(${location.department.toUpperCase()})`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Payment Method</Label>
                            <Select value={selectedProviderId || ''} onValueChange={setSelectedProviderId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment method" />
                              </SelectTrigger>
                              <SelectContent>
                                {providers.filter(p => p.status === 'active').map(provider => (
                                  <SelectItem key={provider.id} value={provider.id}>
                                    {provider.name} ({provider.type.toUpperCase()})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <Button 
                          className="w-full gap-2" 
                          variant="default"
                          onClick={handleCollectPaymentForService}
                          disabled={isCollectingPayment || !selectedLocationId || !selectedProviderId}
                        >
                          {isCollectingPayment ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <DollarSign className="h-4 w-4" />
                          )}
                          {isCollectingPayment ? 'Processing...' : `Collect Payment (₦${selectedRequest.metadata.payment_info.amount?.toLocaleString()})`}
                        </Button>
                      </div>
                    )}

                    {/* Payment Collected Confirmation (for all services) */}
                    {selectedRequest.metadata?.payment_info?.status === 'paid' &&
                     selectedRequest.type !== 'digital_menu' &&
                     selectedRequest.type !== 'room_service' && (
                      <div className="space-y-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-600">Payment Collected</span>
                        </div>
                        {selectedRequest.metadata.payment_info.location_name && (
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>Location: {selectedRequest.metadata.payment_info.location_name}</div>
                            <div>Method: {selectedRequest.metadata.payment_info.provider_name} ({selectedRequest.metadata.payment_info.provider_type?.toUpperCase()})</div>
                            <div>Amount: ₦{selectedRequest.metadata.payment_info.amount?.toLocaleString()}</div>
                            {selectedRequest.metadata.payment_info.collected_at && (
                              <div>Collected: {new Date(selectedRequest.metadata.payment_info.collected_at).toLocaleString()}</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Request History Stats */}
                    {historyStats && historyStats.totalRequests > 1 && (
                      <div className="p-4 bg-muted/30 rounded-lg">
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

                    {/* COLLAPSIBLE Quick Replies - Moved inside scrollable area */}
                    {selectedRequest.status !== 'completed' && (
                      <Collapsible open={quickRepliesOpen} onOpenChange={setQuickRepliesOpen}>
                        <CollapsibleTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full justify-between">
                            <div className="flex items-center gap-2">
                              <Zap className="h-3 w-3" />
                              <span className="text-xs font-medium">Quick Replies</span>
                            </div>
                            <svg
                              className={`h-4 w-4 transition-transform ${quickRepliesOpen ? 'rotate-180' : ''}`}
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="grid grid-cols-2 gap-2">
                            {getQuickReplyTemplates(selectedRequest.type).map((template, idx) => (
                              <Button
                                key={idx}
                                size="sm"
                                variant="outline"
                                onClick={() => handleQuickReply(template)}
                                disabled={isSending}
                                className="justify-start text-left h-auto py-2"
                              >
                                <Zap className="h-3 w-3 mr-1 shrink-0" />
                                <span className="text-xs truncate">{template.substring(0, 20)}...</span>
                              </Button>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Request Context */}
                    {requestContext && (
                      <div className="p-3 bg-muted/50 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium capitalize">
                              {requestContext.type.replace('_', ' ')}
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
                    
                    {/* Chat Messages */}
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
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-xs font-semibold">
                                {msg.sender_name}
                              </p>
                              {msg.sender_role && msg.direction === 'outbound' && (
                                <Badge variant="secondary" className="h-4 text-[10px] px-1.5 py-0">
                                  {msg.sender_role}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm">{msg.message}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {format(new Date(msg.created_at), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>

                {/* FIXED FOOTER - Message Input */}
                {selectedRequest.status !== 'completed' && (
                  <div className="p-4 border-t shrink-0">
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

                {/* FIXED FOOTER - Action Buttons */}
                {selectedRequest.status !== 'completed' && (
                  <div className="p-4 border-t flex gap-2 shrink-0">
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

function RequestCard({ request, isSelected, onClick, orderDetails, isLoading }: any) {
  const config = {
    pending: { icon: Clock, color: 'text-yellow-500' },
    in_progress: { icon: AlertCircle, color: 'text-blue-500' },
    completed: { icon: CheckCircle2, color: 'text-green-500' },
  }[request.status] || { icon: Clock, color: 'text-muted-foreground' };

  const Icon = config.icon;

  // Render loading skeleton
  const renderLoadingSkeleton = () => {
    return (
      <div className="space-y-2 mt-2 p-2 bg-background/50 rounded border border-border">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 bg-muted rounded-full shimmer" />
          <div className="h-3 w-20 bg-muted rounded shimmer" />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <div className="h-3 w-24 bg-muted rounded shimmer" />
            <div className="h-3 w-12 bg-muted rounded shimmer" />
          </div>
          <div className="flex justify-between">
            <div className="h-3 w-20 bg-muted rounded shimmer" />
            <div className="h-3 w-10 bg-muted rounded shimmer" />
          </div>
        </div>
        <div className="flex justify-between pt-1 border-t border-border">
          <div className="h-3 w-12 bg-muted rounded shimmer" />
          <div className="h-3 w-16 bg-muted rounded shimmer" />
        </div>
      </div>
    );
  };

  // Render service-specific context preview
  const renderContextPreview = () => {
    // Show loading skeleton while fetching
    if (isLoading) {
      return renderLoadingSkeleton();
    }

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

      switch (reqData.type) {
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
              {request.type?.replace('_', ' ')}
            </Badge>
            <Icon className={`h-3 w-3 ${config.color}`} />
          </div>
          <p className="text-xs text-muted-foreground">
            {format(new Date(request.created_at), 'MMM d, h:mm a')}
          </p>
        </div>
        {(request.metadata?.room_number || request.room?.number) && (
          <Badge variant="outline" className="text-xs gap-1">
            <MapPin className="h-3 w-3" />
            {request.metadata?.room_number || request.room?.number}
          </Badge>
        )}
      </div>

      {/* Service-Specific Context Preview */}
      {renderContextPreview()}
    </button>
  );
}
