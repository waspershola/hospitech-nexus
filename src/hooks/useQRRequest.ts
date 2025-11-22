import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateRequestData {
  qr_token: string;
  type: string;
  note?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  guest_name?: string;
  guest_contact?: string;
}

interface ServiceRequest {
  id: string;
  tenant_id: string;
  room_id: string | null;
  type: string;
  note: string;
  status: string;
  priority: string;
  qr_token: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface UseQRRequestReturn {
  isCreating: boolean;
  error: string | null;
  request: ServiceRequest | null;
  createRequest: (data: CreateRequestData) => Promise<ServiceRequest | null>;
}

export function useQRRequest(): UseQRRequestReturn {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<ServiceRequest | null>(null);

  const createRequest = async (data: CreateRequestData): Promise<ServiceRequest | null> => {
    setIsCreating(true);
    setError(null);

    try {
      // Phase 3: Enhanced logging before API call
      console.log('[useQRRequest] Creating request:', {
        qr_token: data.qr_token?.substring(0, 8) + '...',
        type: data.type,
        priority: data.priority,
        has_note: !!data.note,
      });

      const { data: result, error: functionError } = await supabase.functions.invoke('qr-request', {
        body: {
          action: 'create_request',
          ...data,
        },
      });

      if (functionError) {
        console.error('[useQRRequest] Edge function error:', {
          message: functionError.message,
          context: functionError.context,
          details: functionError,
        });
        const errorMsg = functionError.message || 'Failed to create request';
        setError(errorMsg);
        toast.error(`Error: ${errorMsg}`);
        setIsCreating(false);
        return null;
      }

      if (!result?.success) {
        console.error('[useQRRequest] Request failed:', {
          error: result?.error,
          details: result?.details,
          full_response: result,
        });
        const errorMsg = result?.error || 'Failed to create request';
        setError(errorMsg);
        toast.error(`Failed: ${errorMsg}`);
        setIsCreating(false);
        return null;
      }

      console.log('[useQRRequest] Request created successfully:', {
        id: result.data?.id,
        type: result.data?.type,
      });
      setRequest(result.data);
      toast.success('Request created successfully');
      setIsCreating(false);
      return result.data;
    } catch (err: any) {
      console.error('[useQRRequest] Unexpected error:', {
        message: err?.message,
        stack: err?.stack,
        error: err,
      });
      const errorMsg = err?.message || 'An unexpected error occurred';
      setError(errorMsg);
      toast.error(`Error: ${errorMsg}`);
      setIsCreating(false);
      return null;
    }
  };

  return {
    isCreating,
    error,
    request,
    createRequest,
  };
}
