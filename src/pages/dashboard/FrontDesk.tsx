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
import { CheckoutRemindersWidget } from '@/modules/frontdesk/components/CheckoutRemindersWidget';
import { BookingFlow } from '@/modules/bookings/BookingFlow';
import { MobileBottomNav } from '@/modules/frontdesk/components/MobileBottomNav';
import { AvailabilityCalendar } from '@/modules/frontdesk/components/AvailabilityCalendar';
import { StatusSyncMonitor } from '@/components/StatusSyncMonitor';
import { BulkCheckInDrawer } from '@/modules/frontdesk/components/BulkCheckInDrawer';
import { QRRequestNotificationWidget } from '@/components/frontdesk/QRRequestNotificationWidget';
import { useOverstayRooms } from '@/hooks/useOverstayRooms';
import { useRoomActions } from '@/modules/frontdesk/hooks/useRoomActions';
import { useRoomRealtime, useBookingRealtime, usePaymentRealtime } from '@/hooks/useRoomRealtime';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, LayoutGrid } from 'lucide-react';

export default function FrontDesk() {
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
  
  const { data: overstayRooms = [] } = useOverstayRooms();
  const { checkOut } = useRoomActions();
  
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
    <div className="h-full flex flex-col bg-background">
      <HeaderBar 
        searchQuery={searchQuery} 
        onSearchChange={setSearchQuery}
        onNewBooking={() => setIsBookingFlowOpen(true)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'status' | 'date')} className="flex-1 flex flex-col">
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
              <div className="px-3 sm:px-4 lg:px-6 pt-2 pb-20 lg:pb-6">
                <RoomStatusOverview 
                  statusFilter={statusFilter}
                  onRoomClick={(roomId) => {
                    setSelectedRoomId(roomId);
                    setContextDate(null);
                  }}
                  globalSearchQuery={searchQuery}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
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
                <AvailabilityCalendar onRoomClick={(roomId, date) => {
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
        onCheckOut={(roomId) => {
          checkOut(roomId);
          setOverstayModalOpen(false);
        }}
      />

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
