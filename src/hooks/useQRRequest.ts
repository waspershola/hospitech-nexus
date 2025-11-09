import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateRequestData {
  qr_token: string;
  type: string;
  service_category: string;
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
  service_category: string;
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
      const { data: result, error: functionError } = await supabase.functions.invoke('qr-request', {
        body: {
          action: 'create_request',
          ...data,
        },
      });

      if (functionError) {
        console.error('[useQRRequest] Error creating request:', functionError);
        setError('Failed to create request');
        toast.error('Failed to create request');
        setIsCreating(false);
        return null;
      }

      if (!result?.success) {
        setError(result?.error || 'Failed to create request');
        toast.error(result?.error || 'Failed to create request');
        setIsCreating(false);
        return null;
      }

      setRequest(result.data);
      toast.success('Request created successfully');
      setIsCreating(false);
      return result.data;
    } catch (err) {
      console.error('[useQRRequest] Unexpected error:', err);
      setError('An unexpected error occurred');
      toast.error('An unexpected error occurred');
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
