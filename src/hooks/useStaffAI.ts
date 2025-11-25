import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UseStaffAIReturn {
  query: (question: string) => Promise<string>;
  isLoading: boolean;
  error: string | null;
}

export function useStaffAI(): UseStaffAIReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { tenantId } = useAuth();

  const query = async (question: string): Promise<string> => {
    if (!tenantId) {
      throw new Error('No tenant context');
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('ai-message', {
        body: {
          action: 'staff_training_query',
          message: question,
          tenant_id: tenantId,
          context: 'staff_training'
        }
      });

      if (functionError) throw functionError;
      if (!data?.success) throw new Error(data?.error || 'AI query failed');

      return data.data.response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to query AI';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return { query, isLoading, error };
}