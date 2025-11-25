import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckSquare, Search, LayoutGrid, Calendar } from 'lucide-react';
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
  viewMode?: 'status' | 'date';
  onViewModeChange?: (mode: 'status' | 'date') => void;
}

export function RoomStatusOverview({ statusFilter, onRoomClick, globalSearchQuery = '', viewMode = 'status', onViewModeChange }: RoomStatusOverviewProps) {
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
    <div className="space-y-3">
      {/* Tabs + Filters Row */}
      <div className="flex flex-wrap items-center gap-2">
        <TabsList className="grid grid-cols-2 w-fit shrink-0">
          <TabsTrigger 
            value="status" 
            className="gap-2 text-xs px-3"
            onClick={() => onViewModeChange?.('status')}
          >
            <LayoutGrid className="h-3 w-3" />
            Room Status
          </TabsTrigger>
          <TabsTrigger 
            value="date" 
            className="gap-2 text-xs px-3"
            onClick={() => onViewModeChange?.('date')}
          >
            <Calendar className="h-3 w-3" />
            By Date
          </TabsTrigger>
        </TabsList>

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
      </div>

      {/* Search + Select Row */}
      <div className="flex items-center gap-2">
        {!globalSearchQuery && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search rooms or guests..."
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}
        
        {globalSearchQuery && (
          <p className="text-sm text-muted-foreground truncate flex-1">
            Searching: <span className="font-medium text-foreground">"{globalSearchQuery}"</span>
          </p>
        )}
        
        <Button
          variant={isSelectionMode ? "default" : "outline"}
          size="default"
          onClick={() => {
            setIsSelectionMode(!isSelectionMode);
            if (isSelectionMode) {
              setSelectedRoomIds([]);
            }
          }}
          className="whitespace-nowrap shrink-0"
        >
          <CheckSquare className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">{isSelectionMode ? 'Exit' : 'Select'}</span>
          {isSelectionMode && selectedRoomIds.length > 0 && (
            <Badge variant="secondary" className="ml-2">
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
