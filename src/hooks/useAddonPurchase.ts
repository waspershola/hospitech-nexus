import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PurchaseAddonParams {
  addonId: string;
  paymentProviderId: string;
}

export function useAddonPurchase() {
  const queryClient = useQueryClient();

  const purchaseAddon = useMutation({
    mutationFn: async ({ addonId, paymentProviderId }: PurchaseAddonParams) => {
      const { data, error } = await supabase.functions.invoke('process-addon-purchase', {
        body: {
          addon_id: addonId,
          payment_provider_id: paymentProviderId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-addons'] });
      queryClient.invalidateQueries({ queryKey: ['platform-billing'] });
      
      // Redirect to payment URL
      if (data.payment_url) {
        window.location.href = data.payment_url;
      } else {
        toast.success('Purchase initiated successfully');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to process purchase');
    },
  });

  return {
    purchaseAddon,
    isPurchasing: purchaseAddon.isPending,
  };
}
