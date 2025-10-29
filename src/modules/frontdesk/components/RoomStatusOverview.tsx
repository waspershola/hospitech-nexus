import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckSquare, Search } from 'lucide-react';
import { RoomGrid } from './RoomGrid';
import { FilterBar } from './FilterBar';
import { BulkRoomActions } from './BulkRoomActions';
import { useRoomCategories } from '@/hooks/useRoomCategories';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RoomStatusOverviewProps {
  statusFilter: string | null;
  onRoomClick: (roomId: string) => void;
  globalSearchQuery?: string;
}

export function RoomStatusOverview({ statusFilter, onRoomClick, globalSearchQuery = '' }: RoomStatusOverviewProps) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  
  // Use global search from HeaderBar if provided, otherwise use local search
  const searchQuery = globalSearchQuery || localSearchQuery;
  const [floorFilter, setFloorFilter] = useState<number | null>(null);
  const [organizationFilter, setOrganizationFilter] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
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

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const handleClearFilters = () => {
    setCategoryFilter(null);
    setFloorFilter(null);
    setOrganizationFilter(null);
  };

  const handleRoomSelectionChange = (roomId: string, selected: boolean) => {
    setSelectedRoomIds(prev => 
      selected 
        ? [...prev, roomId]
        : prev.filter(id => id !== roomId)
    );
  };

  const handleClearSelection = () => {
    setSelectedRoomIds([]);
    setIsSelectionMode(false);
  };

  const handleBulkActionComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
    queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] });
  };

  return (
    <div className="space-y-4">
      {!globalSearchQuery && (
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by room number or guest name..."
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={isSelectionMode ? "default" : "outline"}
            size="default"
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              if (isSelectionMode) {
                setSelectedRoomIds([]);
              }
            }}
            className="rounded-xl"
          >
            <CheckSquare className="w-4 h-4 mr-2" />
            {isSelectionMode ? 'Exit Selection' : 'Select Multiple'}
          </Button>
        </div>
      )}
      
      {globalSearchQuery && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Searching: <span className="font-medium text-foreground">"{globalSearchQuery}"</span>
          </p>
          <Button
            variant={isSelectionMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              if (isSelectionMode) {
                setSelectedRoomIds([]);
              }
            }}
            className="rounded-xl"
          >
            <CheckSquare className="w-4 h-4 mr-2" />
            {isSelectionMode ? 'Exit Selection' : 'Select Multiple'}
          </Button>
        </div>
      )}

      <FilterBar
        statusFilter={statusFilter}
        categoryFilter={categoryFilter}
        floorFilter={floorFilter}
        organizationFilter={organizationFilter}
        categories={categories}
        floors={floors}
        organizations={organizations}
        onStatusChange={() => {}} // Status controlled by parent KPI clicks
        onCategoryChange={setCategoryFilter}
        onFloorChange={setFloorFilter}
        onOrganizationChange={setOrganizationFilter}
        onClearAll={handleClearFilters}
      />

      <RoomGrid
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        categoryFilter={categoryFilter}
        floorFilter={floorFilter}
        organizationFilter={organizationFilter}
        onRoomClick={onRoomClick}
        isSelectionMode={isSelectionMode}
        selectedRoomIds={selectedRoomIds}
        onRoomSelectionChange={handleRoomSelectionChange}
      />

      <BulkRoomActions
        selectedRoomIds={selectedRoomIds}
        onClearSelection={handleClearSelection}
        onComplete={handleBulkActionComplete}
      />
    </div>
  );
}
