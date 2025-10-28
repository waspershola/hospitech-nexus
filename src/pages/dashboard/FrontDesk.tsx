import { useState } from 'react';
import { HeaderBar } from '@/modules/frontdesk/components/HeaderBar';
import { QuickKPIs } from '@/modules/frontdesk/components/QuickKPIs';
import { RoomStatusOverview } from '@/modules/frontdesk/components/RoomStatusOverview';
import { RoomLegend } from '@/modules/frontdesk/components/RoomLegend';
import { RoomActionDrawer } from '@/modules/frontdesk/components/RoomActionDrawer';

export default function FrontDesk() {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  return (
    <div className="h-full flex flex-col bg-background">
      <HeaderBar />
      
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <QuickKPIs onFilterClick={setStatusFilter} />
        
        <div className="flex gap-6">
          <div className="flex-1">
            <RoomStatusOverview 
              statusFilter={statusFilter}
              onRoomClick={setSelectedRoomId}
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
    </div>
  );
}
