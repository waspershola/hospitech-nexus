import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePasswordReset() {
  const queryClient = useQueryClient();

  const resetPassword = useMutation({
    mutationFn: async (staffId: string) => {
      const { data, error } = await supabase.functions.invoke('reset-password/reset-password', {
        body: { staff_id: staffId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      // Don't show toast here - let the modal handle the UI
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reset password');
    },
  });

  return { resetPassword };
}
