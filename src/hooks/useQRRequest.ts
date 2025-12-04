import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  isElectronContext, 
  offlineCreateRequest, 
  saveRequestEvent 
} from '@/lib/offline/electronPOSAndQRBridge';

interface CreateRequestData {
  qr_token: string;
  type: string;
  note?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  guest_name?: string;
  guest_contact?: string;
  guest_session_token?: string; // GUEST-SESSION-SECURITY: Per-device session token
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
  isOfflineMode: boolean;
}

export function useQRRequest(): UseQRRequestReturn {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const createRequest = async (data: CreateRequestData): Promise<ServiceRequest | null> => {
    setIsCreating(true);
    setError(null);
    setIsOfflineMode(false);

    try {
      // Phase 13: Try Electron offline path first
      if (isElectronContext()) {
        console.log('[useQRRequest] PHASE-13 Attempting offline request creation');
        
        // Note: tenantId would need to come from QR token validation in real implementation
        // For offline mode, Electron runtime handles tenant resolution
        const offlineResult = await offlineCreateRequest('offline-tenant', {
          qr_token: data.qr_token,
          type: data.type,
          note: data.note,
          priority: data.priority,
          guest_name: data.guest_name,
          guest_contact: data.guest_contact,
          guest_session_token: data.guest_session_token,
        });

        if (offlineResult.source === 'offline' && offlineResult.data?.success) {
          console.log('[useQRRequest] PHASE-13 Request created offline:', offlineResult.data);
          
          // Save event to journal
          await saveRequestEvent('offline-tenant', {
            type: 'request_created',
            requestId: offlineResult.data.requestId || 'pending',
            qrToken: data.qr_token,
            timestamp: new Date().toISOString(),
            payload: data,
          });

          // Create optimistic response
          const offlineRequest: ServiceRequest = {
            id: offlineResult.data.requestId || `offline-${Date.now()}`,
            tenant_id: 'offline-tenant',
            room_id: null,
            type: data.type,
            note: data.note || '',
            status: 'pending',
            priority: data.priority || 'normal',
            qr_token: data.qr_token,
            metadata: { offline: true, created_offline: true },
            created_at: new Date().toISOString(),
          };

          setRequest(offlineRequest);
          setIsOfflineMode(true);
          toast.success('Request created (offline mode)');
          setIsCreating(false);
          return offlineRequest;
        }
        
        // If offline API not available or failed, continue to online path
        console.log('[useQRRequest] PHASE-13 Offline path unavailable, falling back to online');
      }

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
          guest_session_token: data.guest_session_token, // GUEST-SESSION-SECURITY: Pass session token explicitly
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
    isOfflineMode,
  };
}
