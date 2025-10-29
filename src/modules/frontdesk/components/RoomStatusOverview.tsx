import { RoomGrid } from './RoomGrid';
import { Input } from '@/components/ui/input';
import { FilterBar } from './FilterBar';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useRoomCategories } from '@/hooks/useRoomCategories';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RoomStatusOverviewProps {
  statusFilter: string | null;
  onRoomClick: (roomId: string) => void;
}

export function RoomStatusOverview({ statusFilter, onRoomClick }: RoomStatusOverviewProps) {
  const { tenantId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [floorFilter, setFloorFilter] = useState<number | null>(null);
  const { categories } = useRoomCategories();

  const { data: floors = [] } = useQuery({
    queryKey: ['room-floors', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('rooms')
        .select('floor')
        .eq('tenant_id', tenantId)
        .not('floor', 'is', null);

      if (error) throw error;
      const uniqueFloors = [...new Set(data.map((r) => r.floor))].sort((a, b) => a - b);
      return uniqueFloors;
    },
    enabled: !!tenantId,
  });

  const handleClearFilters = () => {
    setCategoryFilter(null);
    setFloorFilter(null);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by room number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <FilterBar
        statusFilter={statusFilter}
        categoryFilter={categoryFilter}
        floorFilter={floorFilter}
        categories={categories}
        floors={floors}
        onStatusChange={() => {}} // Status controlled by parent KPI clicks
        onCategoryChange={setCategoryFilter}
        onFloorChange={setFloorFilter}
        onClearAll={handleClearFilters}
      />

      <RoomGrid
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        categoryFilter={categoryFilter}
        floorFilter={floorFilter}
        onRoomClick={onRoomClick}
      />
    </div>
  );
}
