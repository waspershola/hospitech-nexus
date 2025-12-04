import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, RefreshCw } from 'lucide-react';
import { HeaderBar } from '@/modules/frontdesk/components/HeaderBar';
import { QuickKPIs } from '@/modules/frontdesk/components/QuickKPIs';
import { RoomStatusOverview } from '@/modules/frontdesk/components/RoomStatusOverview';
import { RoomLegend } from '@/modules/frontdesk/components/RoomLegend';
import { RoomActionDrawer } from '@/modules/frontdesk/components/RoomActionDrawer';
import { AssignRoomDrawer } from '@/modules/frontdesk/components/AssignRoomDrawer';
import { OverstayAlertModal } from '@/modules/frontdesk/components/OverstayAlertModal';
import { ForceCheckoutModal } from '@/modules/frontdesk/components/ForceCheckoutModal';
import { CheckoutRemindersWidget } from '@/modules/frontdesk/components/CheckoutRemindersWidget';
import { BookingFlow } from '@/modules/bookings/BookingFlow';
import { MobileBottomNav } from '@/modules/frontdesk/components/MobileBottomNav';
import { AvailabilityCalendar } from '@/modules/frontdesk/components/AvailabilityCalendar';
import { StatusSyncMonitor } from '@/components/StatusSyncMonitor';
import { BulkCheckInDrawer } from '@/modules/frontdesk/components/BulkCheckInDrawer';
import { QRRequestNotificationWidget } from '@/components/frontdesk/QRRequestNotificationWidget';
import { useOverstayRooms } from '@/hooks/useOverstayRooms';
import { useRoomActions } from '@/modules/frontdesk/hooks/useRoomActions';
import { useForceCheckout } from '@/hooks/useForceCheckout';
import { useRoomRealtime, useBookingRealtime, usePaymentRealtime } from '@/hooks/useRoomRealtime';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, LayoutGrid } from 'lucide-react';

export default function FrontDesk() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [contextDate, setContextDate] = useState<Date | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'status' | 'date'>('status');

  const handleFilterToggle = (status: string | null) => {
    setStatusFilter(prev => prev === status ? null : status);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [isBookingFlowOpen, setIsBookingFlowOpen] = useState(false);
  const [overstayModalOpen, setOverstayModalOpen] = useState(false);
  const [hasShownOverstayAlert, setHasShownOverstayAlert] = useState(false);
  const [assignDrawerOpen, setAssignDrawerOpen] = useState(false);
  const [assignRoomData, setAssignRoomData] = useState<{ roomId: string; roomNumber: string } | null>(null);
  const [bulkCheckInOpen, setBulkCheckInOpen] = useState(false);
  const [forceCheckoutModalOpen, setForceCheckoutModalOpen] = useState(false);
  const [forceCheckoutData, setForceCheckoutData] = useState<{ roomId: string; bookingId: string; balance: number; guestName: string; roomNumber: string } | null>(null);
  
  const { data: overstayRooms = [] } = useOverstayRooms();
  const { checkOut } = useRoomActions();
  const { mutate: forceCheckout, isPending: isForcingCheckout } = useForceCheckout();
  
  // Enable real-time updates
  useRoomRealtime();
  useBookingRealtime();
  usePaymentRealtime();

  // Handle opening AssignRoomDrawer from RoomActionDrawer
  const handleOpenAssignDrawer = (roomId: string, roomNumber: string) => {
    setAssignRoomData({ roomId, roomNumber });
    setAssignDrawerOpen(true);
    setSelectedRoomId(null); // Close RoomActionDrawer
  };

  // Show overstay alert on page load if there are overstays
  useEffect(() => {
    if (overstayRooms.length > 0 && !hasShownOverstayAlert) {
      setOverstayModalOpen(true);
      setHasShownOverstayAlert(true);
    }
  }, [overstayRooms.length, hasShownOverstayAlert]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + N for new booking
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setIsBookingFlowOpen(true);
      }
      // Ctrl/Cmd + D for date view
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        setViewMode(prev => prev === 'status' ? 'date' : 'status');
      }
      // Escape to close drawers/modals
      if (e.key === 'Escape') {
        setSelectedRoomId(null);
        setIsBookingFlowOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden max-w-full">
      <HeaderBar 
        searchQuery={searchQuery} 
        onSearchChange={setSearchQuery}
        onNewBooking={() => setIsBookingFlowOpen(true)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'status' | 'date')} className="flex-1 flex flex-col">
          {/* TABS ROW - Always visible */}
          <div className="px-3 sm:px-4 lg:px-6 pt-2">
            <TabsList className="grid grid-cols-2 w-fit h-8">
              <TabsTrigger value="status" className="gap-1.5 text-xs px-2.5">
                <LayoutGrid className="h-3 w-3" />
                Room Status
              </TabsTrigger>
              <TabsTrigger value="date" className="gap-1.5 text-xs px-2.5">
                <Calendar className="h-3 w-3" />
                By Date
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="status" className="flex-1 flex flex-col m-0 overflow-hidden data-[state=inactive]:absolute data-[state=inactive]:invisible data-[state=inactive]:pointer-events-none">
            <div className="px-3 sm:px-4 lg:px-6 pt-2 space-y-2">
              <StatusSyncMonitor />
              <CheckoutRemindersWidget />
              <QuickKPIs 
                onFilterClick={handleFilterToggle} 
                activeFilter={statusFilter}
                onArrivalsClick={() => setBulkCheckInOpen(true)}
              />
            </div>
            
            <ScrollArea className="flex-1">
              <div className="px-3 sm:px-4 lg:px-6 pt-2 pb-20 lg:pb-6 max-w-full overflow-hidden">
                <RoomStatusOverview 
                  statusFilter={statusFilter}
                  onRoomClick={async (roomId) => {
                    // FOLIO-PREFETCH-V1: Prefetch room data before opening drawer
                    if (tenantId) {
                      // Prefetch room + booking data
                      const roomPromise = queryClient.prefetchQuery({
                        queryKey: ['room-detail', roomId, 'today'],
                        queryFn: async () => {
                          const { data } = await supabase
                            .from('rooms')
                            .select(`
                              *,
                              category:room_categories(name, short_code, base_rate),
                              bookings!bookings_room_id_fkey(
                                id,
                                check_in,
                                check_out,
                                status,
                                total_amount,
                                guest_id,
                                room_id,
                                organization_id,
                                metadata,
                                guest:guests(id, name, email, phone),
                                organization:organizations(id, name, credit_limit, allow_negative_balance)
                              )
                            `)
                            .eq('id', roomId)
                            .eq('tenant_id', tenantId)
                            .maybeSingle();
                          return data;
                        },
                        staleTime: 30 * 1000,
                      });
                      
                      // Start prefetch but don't wait (non-blocking)
                      roomPromise.catch(console.error);
                    }
                    setSelectedRoomId(roomId);
                    setContextDate(null);
                  }}
                  globalSearchQuery={searchQuery}
                />
                
                <div className="mt-4">
                  <RoomLegend />
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="date" className="flex-1 flex flex-col m-0 overflow-hidden data-[state=inactive]:absolute data-[state=inactive]:invisible data-[state=inactive]:pointer-events-none">
            <ScrollArea className="flex-1">
              <div className="px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 pb-20 lg:pb-6">
                <AvailabilityCalendar onRoomClick={async (roomId, date) => {
                  // FOLIO-PREFETCH-V1: Prefetch room data for date view
                  if (tenantId && date) {
                    const dateKey = format(date, 'yyyy-MM-dd');
                    const roomPromise = queryClient.prefetchQuery({
                      queryKey: ['room-detail', roomId, dateKey],
                      queryFn: async () => {
                        const { data } = await supabase
                          .from('rooms')
                          .select(`
                            *,
                            category:room_categories(name, short_code, base_rate),
                            bookings!bookings_room_id_fkey(
                              id,
                              check_in,
                              check_out,
                              status,
                              total_amount,
                              guest_id,
                              room_id,
                              organization_id,
                              metadata,
                              guest:guests(id, name, email, phone),
                              organization:organizations(id, name, credit_limit, allow_negative_balance)
                            )
                          `)
                          .eq('id', roomId)
                          .eq('tenant_id', tenantId)
                          .maybeSingle();
                        return data;
                      },
                      staleTime: 30 * 1000,
                    });
                    
                    // Start prefetch but don't wait (non-blocking)
                    roomPromise.catch(console.error);
                  }
                  setSelectedRoomId(roomId);
                  setContextDate(date);
                }} />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      <RoomActionDrawer 
        roomId={selectedRoomId}
        contextDate={contextDate}
        open={!!selectedRoomId}
        onClose={() => {
          setSelectedRoomId(null);
          setContextDate(null);
        }}
        onOpenAssignDrawer={handleOpenAssignDrawer}
      />

      {assignDrawerOpen && assignRoomData && (
        <AssignRoomDrawer
          open={assignDrawerOpen}
          onClose={() => {
            setAssignDrawerOpen(false);
            setAssignRoomData(null);
          }}
          roomId={assignRoomData.roomId}
          roomNumber={assignRoomData.roomNumber}
        />
      )}

      <OverstayAlertModal
        open={overstayModalOpen}
        onClose={() => setOverstayModalOpen(false)}
        overstayRooms={overstayRooms}
        onExtendStay={(roomId) => {
          setSelectedRoomId(roomId);
          setOverstayModalOpen(false);
        }}
        onCheckOut={async (roomId) => {
          // Find the overstay room data to get balance
          const overstayRoom = overstayRooms.find(r => r.id === roomId);
          
          if (overstayRoom && overstayRoom.balance > 0) {
            // Has outstanding balance - trigger force checkout modal
            const { data: booking } = await supabase
              .from('bookings')
              .select('id')
              .eq('room_id', roomId)
              .eq('status', 'checked_in')
              .maybeSingle();
            
            if (booking) {
              setForceCheckoutData({
                roomId,
                bookingId: booking.id,
                balance: overstayRoom.balance,
                guestName: overstayRoom.guest_name,
                roomNumber: overstayRoom.number,
              });
              setForceCheckoutModalOpen(true);
              setOverstayModalOpen(false);
            }
          } else {
            // No balance - regular checkout
            checkOut(roomId);
            setOverstayModalOpen(false);
          }
        }}
      />

      {forceCheckoutModalOpen && forceCheckoutData && (
        <ForceCheckoutModal
          open={forceCheckoutModalOpen}
          onClose={() => {
            setForceCheckoutModalOpen(false);
            setForceCheckoutData(null);
          }}
          onConfirm={(reason, createReceivable, approvalToken) => {
            forceCheckout({
              bookingId: forceCheckoutData.bookingId,
              reason,
              createReceivable,
              approvalToken,
            });
            setForceCheckoutModalOpen(false);
            setForceCheckoutData(null);
          }}
          balance={forceCheckoutData.balance}
          guestName={forceCheckoutData.guestName}
          roomNumber={forceCheckoutData.roomNumber}
          bookingId={forceCheckoutData.bookingId}
          isLoading={isForcingCheckout}
        />
      )}

      <BookingFlow
        open={isBookingFlowOpen}
        onClose={() => setIsBookingFlowOpen(false)}
      />

      <MobileBottomNav 
        onNewBooking={() => setIsBookingFlowOpen(true)}
      />

      <BulkCheckInDrawer
        open={bulkCheckInOpen}
        onClose={() => setBulkCheckInOpen(false)}
      />
    </div>
  );
}
