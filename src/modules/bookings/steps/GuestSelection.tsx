import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Search, UserPlus, Check } from 'lucide-react';
import { GuestQuickForm } from '../components/GuestQuickForm';
import type { BookingData } from '../BookingFlow';

interface GuestSelectionProps {
  bookingData: BookingData;
  onChange: (data: BookingData) => void;
  onNext: () => void;
}

export function GuestSelection({ bookingData, onChange, onNext }: GuestSelectionProps) {
  const { tenantId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewGuestForm, setShowNewGuestForm] = useState(false);

  const { data: guests, isLoading } = useQuery({
    queryKey: ['guests', tenantId, searchQuery],
    queryFn: async () => {
      if (!tenantId) return [];
      
      let query = supabase
        .from('guests')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && !showNewGuestForm,
  });

  const handleGuestSelect = (guestId: string) => {
    onChange({ ...bookingData, guestId });
  };

  const handleNewGuest = (guestId: string) => {
    onChange({ ...bookingData, guestId });
    setShowNewGuestForm(false);
  };

  if (showNewGuestForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Add New Guest</h3>
          <Button variant="outline" onClick={() => setShowNewGuestForm(false)}>
            Cancel
          </Button>
        </div>
        <GuestQuickForm onSuccess={handleNewGuest} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowNewGuestForm(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          New Guest
        </Button>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading guests...</p>
        ) : guests && guests.length > 0 ? (
          guests.map((guest) => (
            <Card
              key={guest.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                bookingData.guestId === guest.id ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => handleGuestSelect(guest.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{guest.name}</p>
                  <p className="text-sm text-muted-foreground">{guest.email}</p>
                  <p className="text-sm text-muted-foreground">{guest.phone}</p>
                </div>
                {bookingData.guestId === guest.id && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </div>
            </Card>
          ))
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No guests found. Click "New Guest" to add one.
          </p>
        )}
      </div>
    </div>
  );
}
