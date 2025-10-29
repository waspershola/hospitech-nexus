import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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

export default function FrontDesk() {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBookingFlowOpen, setIsBookingFlowOpen] = useState(false);
  const [overstayModalOpen, setOverstayModalOpen] = useState(false);
  const [hasShownOverstayAlert, setHasShownOverstayAlert] = useState(false);
  
  const { data: overstayRooms = [] } = useOverstayRooms();
  const { checkOut } = useRoomActions();

  // Show overstay alert on page load if there are overstays
  useEffect(() => {
    if (overstayRooms.length > 0 && !hasShownOverstayAlert) {
      setOverstayModalOpen(true);
      setHasShownOverstayAlert(true);
    }
  }, [overstayRooms.length, hasShownOverstayAlert]);

  return (
    <div className="h-full flex flex-col bg-background">
      <HeaderBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-semibold text-foreground">Room Management</h2>
          <p className="text-sm text-muted-foreground">Monitor and manage all rooms from one dashboard</p>
        </div>
        <Button onClick={() => setIsBookingFlowOpen(true)} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          New Booking
        </Button>
      </div>
      
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <QuickKPIs onFilterClick={setStatusFilter} />
        
        <div className="flex gap-6">
        <div className="flex-1">
            <RoomStatusOverview 
              statusFilter={statusFilter}
              onRoomClick={setSelectedRoomId}
              globalSearchQuery={searchQuery}
            />
          </div>
          
          <div className="w-64 flex-shrink-0">
            <RoomLegend />
          </div>
        </div>
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
