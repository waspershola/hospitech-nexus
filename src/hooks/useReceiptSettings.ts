import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ReceiptSettings {
  id: string;
  tenant_id: string;
  location_id: string | null;
  paper_size: 'A4' | 'A5' | '58mm' | '80mm';
  printer_name: string | null;
  printer_endpoint: string | null;
  header_text: string;
  footer_text: string;
  logo_url: string | null;
  show_vat_breakdown: boolean;
  include_service_charge: boolean;
  show_provider_fee: boolean;
  show_qr_code: boolean;
  alignment: 'left' | 'center' | 'right';
  font_size: 'small' | 'normal' | 'large';
  auto_print_on_checkout: boolean;
  auto_print_on_payment: boolean;
  created_at: string;
  updated_at: string;
}

export function useReceiptSettings(locationId?: string) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['receipt-settings', tenantId, locationId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      let query = supabase
        .from('receipt_settings')
        .select('*')
        .eq('tenant_id', tenantId);
      
      if (locationId) {
        query = query.eq('location_id', locationId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ReceiptSettings[];
    },
    enabled: !!tenantId,
  });

  const upsertSettings = useMutation({
    mutationFn: async (settings: Partial<ReceiptSettings>) => {
      const { data, error } = await supabase
        .from('receipt_settings')
        .upsert({
          ...settings,
          tenant_id: tenantId,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipt-settings'] });
      toast.success('Receipt settings saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save receipt settings');
      console.error(error);
    },
  });

  return {
    settings,
    isLoading,
    upsertSettings: upsertSettings.mutate,
    isUpdating: upsertSettings.isPending,
  };
}
