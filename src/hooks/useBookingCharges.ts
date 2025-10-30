import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface BookingCharge {
  id: string;
  tenant_id: string;
  booking_id: string;
  guest_id: string;
  charge_type: 'room' | 'service' | 'food' | 'beverage' | 'balance_due' | 'other';
  description: string;
  amount: number;
  department?: string;
  provider_id?: string;
  location_id?: string;
  charged_at: string;
  charged_by?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface BookingChargesSummary {
  charges: BookingCharge[];
  totalCharged: number;
  totalPaid: number;
  balance: number;
  isLoading: boolean;
}

export function useBookingCharges(bookingId?: string): BookingChargesSummary & {
  addCharge: (charge: Omit<BookingCharge, 'id' | 'tenant_id' | 'created_at' | 'charged_at'>) => Promise<void>;
} {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  // Fetch charges for the booking
  const { data: charges = [], isLoading: chargesLoading } = useQuery({
    queryKey: ['booking-charges', tenantId, bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      
      const { data, error } = await supabase
        .from('booking_charges' as any)
        .select('*')
        .eq('booking_id', bookingId)
        .order('charged_at', { ascending: false });

      if (error) throw error;
      return (data as unknown) as BookingCharge[];
    },
    enabled: !!bookingId && !!tenantId,
  });

  // Fetch total payments for the booking
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['booking-payments', tenantId, bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      
      const { data, error } = await supabase
        .from('payments')
        .select('amount, status')
        .eq('booking_id', bookingId)
        .eq('status', 'success');

      if (error) throw error;
      return data;
    },
    enabled: !!bookingId && !!tenantId,
  });

  // Calculate totals
  const totalCharged = charges.reduce((sum, charge) => sum + Number(charge.amount), 0);
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const balance = totalCharged - totalPaid;

  // Add charge mutation
  const addChargeMutation = useMutation({
    mutationFn: async (charge: Omit<BookingCharge, 'id' | 'tenant_id' | 'created_at' | 'charged_at'>) => {
      if (!tenantId) throw new Error('No tenant ID');

      const { error } = await supabase
        .from('booking_charges' as any)
        .insert([{
          ...charge,
          tenant_id: tenantId,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-charges', tenantId, bookingId] });
      toast.success('Charge added successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to add charge', {
        description: error.message,
      });
    },
  });

  return {
    charges,
    totalCharged,
    totalPaid,
    balance,
    isLoading: chargesLoading || paymentsLoading,
    addCharge: addChargeMutation.mutateAsync,
  };
}
