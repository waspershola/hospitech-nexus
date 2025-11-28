import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UploadPOSSettlementParams {
  file: File;
  providerName: string;
  settlementDate: string;
  columnMapping: {
    amount?: string;
    date?: string;
    stan?: string;
    rrn?: string;
    terminal_id?: string;
    approval_code?: string;
    card_type?: string;
    card_last4?: string;
    merchant_name?: string;
  };
}

export function usePOSSettlementUpload() {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UploadPOSSettlementParams) => {
      if (!tenantId || !user) throw new Error('User not authenticated');

      // Read file content
      const fileContent = await params.file.text();
      
      console.log('[POS-UPLOAD-V1] Uploading file:', {
        fileName: params.file.name,
        size: params.file.size,
        provider: params.providerName
      });

      const { data, error } = await supabase.functions.invoke('upload-pos-settlement', {
        body: {
          fileName: params.file.name,
          fileContent,
          providerName: params.providerName,
          settlementDate: params.settlementDate,
          columnMapping: params.columnMapping,
          tenantId,
          uploadedBy: user.id
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Upload failed');

      return data;
    },
    onSuccess: (data) => {
      toast.success(`Successfully uploaded ${data.processedRecords} settlement records`);
      queryClient.invalidateQueries({ queryKey: ['pos-settlement-imports', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['pos-settlement-records', tenantId] });
    },
    onError: (error: Error) => {
      console.error('[POS-UPLOAD-V1] Upload failed:', error);
      toast.error(`Upload failed: ${error.message}`);
    }
  });
}
