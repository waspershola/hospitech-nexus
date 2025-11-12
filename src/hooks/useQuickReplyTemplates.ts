import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface QuickReplyTemplate {
  id: string;
  tenant_id: string;
  service_category: string;
  template_text: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useQuickReplyTemplates(serviceCategory?: string) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['quick-reply-templates', tenantId, serviceCategory],
    queryFn: async () => {
      if (!tenantId) return [];
      
      let query = supabase
        .from('quick_reply_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (serviceCategory) {
        query = query.eq('service_category', serviceCategory);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as QuickReplyTemplate[];
    },
    enabled: !!tenantId,
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Omit<QuickReplyTemplate, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>) => {
      const { data, error } = await supabase
        .from('quick_reply_templates')
        .insert({ 
          ...template, 
          tenant_id: tenantId!
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-reply-templates'] });
      toast.success('Template created');
    },
    onError: () => {
      toast.error('Failed to create template');
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<QuickReplyTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('quick_reply_templates')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-reply-templates'] });
      toast.success('Template updated');
    },
    onError: () => {
      toast.error('Failed to update template');
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quick_reply_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-reply-templates'] });
      toast.success('Template deleted');
    },
    onError: () => {
      toast.error('Failed to delete template');
    },
  });

  return {
    templates,
    isLoading,
    createTemplate: createTemplate.mutate,
    updateTemplate: updateTemplate.mutate,
    deleteTemplate: deleteTemplate.mutate,
    isCreating: createTemplate.isPending,
    isUpdating: updateTemplate.isPending,
    isDeleting: deleteTemplate.isPending,
  };
}
