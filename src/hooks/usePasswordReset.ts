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
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      if (data.email_sent) {
        toast.success('Password reset successfully. New credentials sent via email.');
      } else {
        toast.success('Password reset successfully.');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reset password');
    },
  });

  return { resetPassword };
}
