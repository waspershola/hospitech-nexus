import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useManagerPin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const setPin = useMutation({
    mutationFn: async ({ pin, confirmPin }: { pin: string; confirmPin: string }) => {
      const { data, error } = await supabase.functions.invoke('set-manager-pin', {
        body: { pin, confirm_pin: confirmPin }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'PIN Set Successfully',
        description: 'Your manager PIN has been set. You can now approve high-risk transactions.',
      });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Set PIN',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const changePin = useMutation({
    mutationFn: async ({ oldPin, newPin, confirmNewPin }: { oldPin: string; newPin: string; confirmNewPin: string }) => {
      const { data, error } = await supabase.functions.invoke('change-manager-pin', {
        body: { old_pin: oldPin, new_pin: newPin, confirm_new_pin: confirmNewPin }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'PIN Changed Successfully',
        description: 'Your manager PIN has been updated.',
      });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Change PIN',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetPin = useMutation({
    mutationFn: async (staffId: string) => {
      const { data, error } = await supabase.functions.invoke('reset-manager-pin', {
        body: { staff_id: staffId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'PIN Reset Successfully',
        description: data.message || 'Staff member must set a new PIN before approving transactions.',
      });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Reset PIN',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    setPin,
    changePin,
    resetPin,
  };
}
