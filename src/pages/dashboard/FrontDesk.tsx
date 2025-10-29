import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus } from 'lucide-react';
import { HeaderBar } from '@/modules/frontdesk/components/HeaderBar';
import { QuickKPIs } from '@/modules/frontdesk/components/QuickKPIs';
import { RoomStatusOverview } from '@/modules/frontdesk/components/RoomStatusOverview';
import { RoomLegend } from '@/modules/frontdesk/components/RoomLegend';
import { RoomActionDrawer } from '@/modules/frontdesk/components/RoomActionDrawer';
import { OverstayAlertModal } from '@/modules/frontdesk/components/OverstayAlertModal';
import { BookingFlow } from '@/modules/bookings/BookingFlow';
import { MobileBottomNav } from '@/modules/frontdesk/components/MobileBottomNav';
import { useOverstayRooms } from '@/hooks/useOverstayRooms';
import { useRoomActions } from '@/modules/frontdesk/hooks/useRoomActions';
import { useRoomRealtime, useBookingRealtime, usePaymentRealtime } from '@/hooks/useRoomRealtime';

export default function FrontDesk() {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBookingFlowOpen, setIsBookingFlowOpen] = useState(false);
  const [overstayModalOpen, setOverstayModalOpen] = useState(false);
  const [hasShownOverstayAlert, setHasShownOverstayAlert] = useState(false);
  
  const { data: overstayRooms = [] } = useOverstayRooms();
  const { checkOut } = useRoomActions();
  
  // Enable real-time updates
  useRoomRealtime();
  useBookingRealtime();
  usePaymentRealtime();

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
      <HeaderBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      
      <div className="p-3 sm:p-4 lg:p-6 border-b border-border flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg lg:text-xl font-display font-semibold text-foreground truncate">Room Management</h2>
          <p className="text-xs lg:text-sm text-muted-foreground hidden sm:block">Monitor and manage all rooms from one dashboard</p>
        </div>
        <Button 
          onClick={() => setIsBookingFlowOpen(true)} 
          size="lg"
          className="hidden sm:flex"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Booking
        </Button>
        <Button 
          onClick={() => setIsBookingFlowOpen(true)} 
          size="icon"
          className="sm:hidden"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
          <QuickKPIs onFilterClick={setStatusFilter} />
        </div>
        
        <ScrollArea className="flex-1">
          <div className="px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 pb-20 lg:pb-6">
            <RoomStatusOverview 
              statusFilter={statusFilter}
              onRoomClick={setSelectedRoomId}
              globalSearchQuery={searchQuery}
            />
            
            {/* Legend moved to bottom */}
            <div className="mt-6">
              <RoomLegend />
            </div>
          </div>
        </ScrollArea>
      </div>

      <RoomActionDrawer 
        roomId={selectedRoomId}
        open={!!selectedRoomId}
        onClose={() => setSelectedRoomId(null)}
      />

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
    </div>
  );
}
