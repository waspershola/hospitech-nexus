import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, Building2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useOrganizationWallet } from '@/hooks/useOrganizationWallet';
import type { BookingData } from '../BookingFlow';

interface BookingConfirmationProps {
  bookingData: BookingData;
  onChange: (data: BookingData) => void;
  onComplete: () => void;
}

export function BookingConfirmation({ bookingData, onComplete }: BookingConfirmationProps) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();
  
  // Fetch organization wallet if booking for org
  const { data: orgWallet } = useOrganizationWallet(bookingData.organizationId);

  const { data: guest } = useQuery({
    queryKey: ['guest', bookingData.guestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('id', bookingData.guestId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!bookingData.guestId,
  });

  const { data: room } = useQuery({
    queryKey: ['room', bookingData.roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*, category:room_categories(name, base_rate)')
        .eq('id', bookingData.roomId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!bookingData.roomId,
  });

  const { data: organization } = useQuery({
    queryKey: ['organization', bookingData.organizationId],
    queryFn: async () => {
      if (!bookingData.organizationId) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', bookingData.organizationId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!bookingData.organizationId,
  });

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId || !bookingData.guestId || !bookingData.roomId || !bookingData.checkIn || !bookingData.checkOut) {
        throw new Error('Missing required booking information');
      }

      // Validate booking with edge function first
      const { data: validationResult, error: validationError } = await supabase.functions.invoke('validate-booking', {
        body: {
          tenant_id: tenantId,
          room_id: bookingData.roomId,
          guest_id: bookingData.guestId,
          organization_id: bookingData.organizationId,
          check_in: bookingData.checkIn.toISOString(),
          check_out: bookingData.checkOut.toISOString(),
          category_id: room?.category_id,
        },
      });

      // Check for HTTP errors first
      if (validationError) {
        throw new Error(validationError.message || 'Validation request failed');
      }

      // Check the actual validation result
      if (!validationResult?.success) {
        throw new Error(validationResult?.error || 'Booking validation failed');
      }

      const actionId = crypto.randomUUID();

      // Use edge function to create booking (auto-creates payment for organizations)
      const { data: createResult, error: createError } = await supabase.functions.invoke('create-booking', {
        body: {
          tenant_id: tenantId,
          guest_id: bookingData.guestId,
          room_id: bookingData.roomId,
          organization_id: bookingData.organizationId,
          check_in: bookingData.checkIn.toISOString(),
          check_out: bookingData.checkOut.toISOString(),
          total_amount: bookingData.totalAmount || 0,
          action_id: actionId,
          department: 'front_desk',
        },
      });

      // Check for HTTP errors first
      if (createError) {
        throw new Error(createError.message || 'Booking creation request failed');
      }

      // Check the actual creation result
      if (!createResult?.success) {
        throw new Error(createResult?.error || 'Booking creation failed');
      }

      return createResult.booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['rooms-grid'] });
      queryClient.invalidateQueries({ queryKey: ['frontdesk-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Booking created successfully!');
      onComplete();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const nights = bookingData.checkIn && bookingData.checkOut
    ? Math.ceil((bookingData.checkOut.getTime() - bookingData.checkIn.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="space-y-6">
      {/* Organization Credit Warning */}
      {orgWallet && orgWallet.nearLimit && (
        <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            Organization wallet is at {orgWallet.percentUsed.toFixed(0)}% of credit limit
          </p>
        </div>
      )}
      
      {orgWallet && orgWallet.overLimit && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <p className="text-sm text-destructive">
            Organization credit limit exceeded. Booking may not be allowed.
          </p>
        </div>
      )}

      <Card className="p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-lg mb-3">Guest Details</h3>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Name:</span> {guest?.name}</p>
            <p><span className="text-muted-foreground">Email:</span> {guest?.email}</p>
            <p><span className="text-muted-foreground">Phone:</span> {guest?.phone}</p>
          </div>
        </div>

        {organization && (
          <>
            <Separator />
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-lg">Organization Booking</h3>
              </div>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Organization:</span> {organization.name}</p>
                <p><span className="text-muted-foreground">Contact:</span> {organization.contact_person}</p>
                {orgWallet && (
                  <>
                    <p>
                      <span className="text-muted-foreground">Wallet Balance:</span>{' '}
                      <span className={orgWallet.balance < 0 ? 'text-destructive font-medium' : 'text-green-600 font-medium'}>
                        ₦{Math.abs(orgWallet.balance).toLocaleString()} {orgWallet.balance < 0 ? '(owing)' : ''}
                      </span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Credit Limit:</span>{' '}
                      ₦{orgWallet.credit_limit.toLocaleString()}
                    </p>
                  </>
                )}
                <Badge variant="secondary" className="mt-2">
                  Will be charged to organization account
                </Badge>
              </div>
            </div>
          </>
        )}

        <Separator />

        <div>
          <h3 className="font-semibold text-lg mb-3">Room Details</h3>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Room:</span> {room?.number}</p>
            <p><span className="text-muted-foreground">Type:</span> {room?.category?.name || room?.type}</p>
            <p><span className="text-muted-foreground">Rate:</span> ₦{room?.category?.base_rate || room?.rate}/night</p>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold text-lg mb-3">Stay Details</h3>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Check-In:</span>{' '}
              {bookingData.checkIn?.toLocaleDateString()}
            </p>
            <p>
              <span className="text-muted-foreground">Check-Out:</span>{' '}
              {bookingData.checkOut?.toLocaleDateString()}
            </p>
            <p>
              <span className="text-muted-foreground">Nights:</span> {nights}
            </p>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">Total Amount:</span>
          <span className="text-2xl font-bold text-primary">
            ₦{bookingData.totalAmount?.toFixed(2) || '0.00'}
          </span>
        </div>
      </Card>

      <Button
        onClick={() => createBookingMutation.mutate()}
        disabled={createBookingMutation.isPending}
        className="w-full"
        size="lg"
      >
        {createBookingMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating Booking...
          </>
        ) : (
          <>
            <Check className="w-4 h-4 mr-2" />
            Confirm Booking
          </>
        )}
      </Button>
    </div>
  );
}
