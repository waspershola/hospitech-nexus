import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFinancials } from '@/hooks/useFinancials';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useOrgLimitValidation } from '@/hooks/useOrgLimitValidation';
import { calculateBookingTotal } from '@/lib/finance/tax';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem,
  CommandList 
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Loader2, 
  Search, 
  UserPlus, 
  Building2, 
  Calendar,
  DollarSign,
  AlertCircle,
  Check,
  ChevronsUpDown
} from 'lucide-react';
import { toast } from 'sonner';
import { GuestQuickForm } from '@/modules/bookings/components/GuestQuickForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface AssignRoomDrawerProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
  roomNumber: string;
}

export function AssignRoomDrawer({ open, onClose, roomId, roomNumber }: AssignRoomDrawerProps) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  const { data: financials } = useFinancials();
  const { organizations = [] } = useOrganizations();

  // Form state
  const [guestId, setGuestId] = useState('');
  const [organizationBooking, setOrganizationBooking] = useState(false);
  const [organizationId, setOrganizationId] = useState('');
  const [checkIn, setCheckIn] = useState(new Date().toISOString().split('T')[0]);
  const [checkOut, setCheckOut] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [actionType, setActionType] = useState<'reserve' | 'checkin'>('reserve');
  const [showNewGuestDialog, setShowNewGuestDialog] = useState(false);
  const [guestSearchOpen, setGuestSearchOpen] = useState(false);
  const [guestSearchTerm, setGuestSearchTerm] = useState('');

  // Fetch guests with search
  const { data: guests = [] } = useQuery({
    queryKey: ['guests', tenantId, guestSearchTerm],
    queryFn: async () => {
      if (!tenantId) return [];
      let query = supabase
        .from('guests')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });
      
      if (guestSearchTerm) {
        query = query.or(`name.ilike.%${guestSearchTerm}%,email.ilike.%${guestSearchTerm}%,phone.ilike.%${guestSearchTerm}%`);
      }
      
      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && open,
  });

  // Fetch room details
  const { data: room } = useQuery({
    queryKey: ['room-detail', roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*, category:room_categories(base_rate, name)')
        .eq('id', roomId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!roomId && open,
  });

  // Organization limit validation
  const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
  const rate = room?.category?.base_rate || room?.rate || 0;
  const baseAmount = rate * nights;
  
  const validationResult = useOrgLimitValidation({
    organizationId: organizationBooking ? organizationId : null,
    guestId,
    department: 'Front Desk',
    amount: room && financials ? calculateBookingTotal(baseAmount, financials).totalAmount : 0,
    enabled: organizationBooking && !!organizationId && !!guestId,
  });

  const selectedGuest = guests.find(g => g.id === guestId);
  const selectedOrg = organizations.find(o => o.id === organizationId);

  // Calculate pricing
  const pricing = financials ? calculateBookingTotal(baseAmount, financials) : null;

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId || !guestId) throw new Error('Missing required data');

      // Validate organization limits if org booking
      if (organizationBooking && validationResult && !validationResult.allowed) {
        throw new Error(validationResult.detail || 'Organization limit exceeded');
      }

      const bookingData = {
        tenant_id: tenantId,
        guest_id: guestId,
        organization_id: organizationBooking ? organizationId : null,
        room_id: roomId,
        check_in: checkIn,
        check_out: checkOut,
        total_amount: pricing?.totalAmount || baseAmount,
        status: actionType === 'reserve' ? 'reserved' : 'confirmed',
        metadata: {
          tax_breakdown: pricing ? {
            base_amount: pricing.baseAmount,
            vat_amount: pricing.vatAmount,
            service_charge_amount: pricing.serviceAmount,
          } : null,
        },
      };

      const { data, error } = await supabase.functions.invoke('create-booking', {
        body: bookingData,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to create booking');

      // If check-in now, update room status
      if (actionType === 'checkin') {
        await supabase
          .from('rooms')
          .update({ status: 'occupied' })
          .eq('id', roomId);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      
      toast.success(
        actionType === 'reserve' 
          ? `Room ${roomNumber} reserved successfully` 
          : `Guest checked in to Room ${roomNumber}`
      );
      onClose();
      
      // Reset form
      setGuestId('');
      setOrganizationId('');
      setOrganizationBooking(false);
      setActionType('reserve');
    },
    onError: (error: Error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Assign Room {roomNumber}
            </SheetTitle>
            <SheetDescription>
              {room?.category?.name && `${room.category.name} • `}
              ₦{rate.toLocaleString()} per night
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 pt-6">
            {/* Guest Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Select Guest *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewGuestDialog(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  New Guest
                </Button>
              </div>

              <Popover open={guestSearchOpen} onOpenChange={setGuestSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {selectedGuest ? (
                      <span className="truncate">{selectedGuest.name}</span>
                    ) : (
                      <span className="text-muted-foreground">Search guest by name, email, or phone...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search guests..." 
                      value={guestSearchTerm}
                      onValueChange={setGuestSearchTerm}
                    />
                    <CommandEmpty>No guests found.</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {guests.map((guest) => (
                          <CommandItem
                            key={guest.id}
                            value={guest.id}
                            onSelect={() => {
                              setGuestId(guest.id);
                              setGuestSearchOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                guestId === guest.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{guest.name}</span>
                              <span className="text-sm text-muted-foreground">
                                {guest.email || guest.phone}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {selectedGuest && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                  <p className="font-medium">{selectedGuest.name}</p>
                  {selectedGuest.email && <p className="text-muted-foreground">{selectedGuest.email}</p>}
                  {selectedGuest.phone && <p className="text-muted-foreground">{selectedGuest.phone}</p>}
                </div>
              )}
            </div>

            <Separator />

            {/* Booking Type Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Organization Booking</Label>
                <p className="text-sm text-muted-foreground">
                  Charge to a corporate account
                </p>
              </div>
              <Switch
                checked={organizationBooking}
                onCheckedChange={setOrganizationBooking}
              />
            </div>

            {/* Organization Selection */}
            {organizationBooking && (
              <div className="space-y-3">
                <Label htmlFor="organization">Organization *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {selectedOrg ? (
                        <span className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {selectedOrg.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Select organization...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="Search organizations..." />
                      <CommandEmpty>No organizations found.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {organizations.filter(o => o.active).map((org) => (
                            <CommandItem
                              key={org.id}
                              value={org.id}
                              onSelect={() => setOrganizationId(org.id)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  organizationId === org.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{org.name}</span>
                                {org.credit_limit && (
                                  <span className="text-sm text-muted-foreground">
                                    Credit Limit: ₦{Number(org.credit_limit).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Organization Limit Warning */}
                {validationResult.isLoading && <p className="text-sm text-muted-foreground">Validating limits...</p>}
                {validationResult && !validationResult.allowed && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{validationResult.detail}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <Separator />

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="checkIn">Check-In Date *</Label>
                <Input
                  id="checkIn"
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkOut">Check-Out Date *</Label>
                <Input
                  id="checkOut"
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  min={checkIn}
                />
              </div>
            </div>

            {/* Action Type */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Action</Label>
              <RadioGroup value={actionType} onValueChange={(v: any) => setActionType(v)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="reserve" id="reserve" />
                  <Label htmlFor="reserve" className="font-normal cursor-pointer">
                    Reserve Room (guest will check in later)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="checkin" id="checkin" />
                  <Label htmlFor="checkin" className="font-normal cursor-pointer">
                    Check In Now (immediate occupancy)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Price Breakdown */}
            {pricing && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-base font-medium">
                  <DollarSign className="h-4 w-4" />
                  Price Breakdown
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{nights} night(s) @ ₦{rate.toLocaleString()}</span>
                    <span className="font-medium">₦{pricing.baseAmount.toLocaleString()}</span>
                  </div>
                  {pricing.vatAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">VAT ({(financials?.vat_rate || 0) * 100}%)</span>
                      <span>₦{pricing.vatAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {pricing.serviceAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service Charge ({financials?.service_charge || 0}%)</span>
                      <span>₦{pricing.serviceAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-base font-semibold">
                    <span>Total Amount</span>
                    <span>₦{pricing.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => assignMutation.mutate()}
                disabled={
                  !guestId || 
                  assignMutation.isPending || 
                  (organizationBooking && !organizationId) ||
                  (validationResult && !validationResult.allowed)
                }
                className="flex-1"
              >
                {assignMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {actionType === 'reserve' ? 'Reserve Room' : 'Check In Now'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* New Guest Dialog */}
      <Dialog open={showNewGuestDialog} onOpenChange={setShowNewGuestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Guest</DialogTitle>
          </DialogHeader>
          <GuestQuickForm
            onSuccess={(newGuestId) => {
              setGuestId(newGuestId);
              setShowNewGuestDialog(false);
              toast.success('Guest added successfully');
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
