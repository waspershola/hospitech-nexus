import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    <div className="space-y-2">
      {/* Filters Row with Tabs and Select */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterBar
          statusFilter={statusFilter}
          categoryFilter={categoryFilter}
          floorFilter={floorFilter}
          organizationFilter={organizationFilter}
          categories={categories}
          floors={floors}
          organizations={organizations}
          onStatusChange={(value) => {
            // Filter bar can change status, but will be overridden by parent
            // This allows clearing the filter from the dropdown
          }}
          onCategoryChange={setCategoryFilter}
          onFloorChange={setFloorFilter}
          onOrganizationChange={setOrganizationFilter}
          onClearAll={handleClearFilters}
        />
        
        <Button
          variant={isSelectionMode ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setIsSelectionMode(!isSelectionMode);
            if (isSelectionMode) {
              setSelectedRoomIds([]);
            }
          }}
          className="whitespace-nowrap shrink-0 h-8"
        >
          <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
          <span className="hidden sm:inline text-xs">{isSelectionMode ? 'Exit' : 'Select'}</span>
          {isSelectionMode && selectedRoomIds.length > 0 && (
            <Badge variant="secondary" className="ml-1.5 text-[9px] h-4 px-1">
              {selectedRoomIds.length}
            </Badge>
          )}
        </Button>
      </div>

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

      {isSelectionMode && selectedRoomIds.length > 0 && (
        <div className="fixed bottom-16 lg:bottom-4 left-4 right-4 lg:left-auto lg:right-6 z-40">
          <BulkRoomActions
            selectedRoomIds={selectedRoomIds}
            onClearSelection={handleClearSelection}
            onComplete={handleBulkActionComplete}
          />
        </div>
      )}
    </div>
  );
}
