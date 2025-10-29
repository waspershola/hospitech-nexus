import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

interface ConfigStore {
  tenantId: string | null;
  configurations: Record<string, any>;
  branding: any;
  financials: any;
  emailSettings: any;
  hotelMeta: any;
  documentTemplates: any[];
  unsavedChanges: Set<string>;
  lastSyncTime: Date | null;
  isLoading: boolean;
  
  // Actions
  setTenantId: (tenantId: string) => void;
  loadAllConfig: (tenantId: string) => Promise<void>;
  loadHotelMeta: () => Promise<void>;
  updateConfig: (key: string, value: any) => void;
  updateBranding: (data: any) => void;
  updateFinancials: (data: any) => void;
  updateEmailSettings: (data: any) => void;
  updateHotelMeta: (data: any) => void;
  updateDocumentTemplate: (templateType: string, data: any) => void;
  saveConfig: (key: string) => Promise<void>;
  saveBranding: () => Promise<void>;
  saveFinancials: () => Promise<void>;
  saveEmailSettings: () => Promise<void>;
  saveHotelMeta: () => Promise<void>;
  saveDocumentTemplate: (templateType: string) => Promise<void>;
  saveAllChanges: () => Promise<void>;
  resetChanges: () => void;
  markSaved: (key: string) => void;
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  tenantId: null,
  configurations: {},
  branding: {},
  financials: {},
  emailSettings: {},
  hotelMeta: {},
  documentTemplates: [],
  unsavedChanges: new Set(),
  lastSyncTime: null,
  isLoading: false,

  setTenantId: (tenantId) => set({ tenantId }),

  loadAllConfig: async (tenantId: string) => {
    set({ isLoading: true });
    try {
      // Load general configurations
      const { data: configs } = await supabase
        .from('hotel_configurations')
        .select('key, value')
        .eq('tenant_id', tenantId);

      const configurationsMap: Record<string, any> = {};
      configs?.forEach(config => {
        configurationsMap[config.key] = config.value;
      });

      // Load branding
      const { data: branding } = await supabase
        .from('hotel_branding')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      // Load financials
      const { data: financials } = await supabase
        .from('hotel_financials')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      // Load email settings
      const { data: emailSettings } = await supabase
        .from('email_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      // Load hotel meta
      const { data: hotelMeta } = await supabase
        .from('hotel_meta')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      // Load document templates
      const { data: documentTemplates } = await supabase
        .from('document_templates')
        .select('*')
        .eq('tenant_id', tenantId);

      set({
        configurations: configurationsMap,
        branding: branding || {},
        financials: financials || {},
        emailSettings: emailSettings || {},
        hotelMeta: hotelMeta || {},
        documentTemplates: documentTemplates || [],
        lastSyncTime: new Date(),
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load configuration:', error);
      set({ isLoading: false });
    }
  },

  updateConfig: (key, value) => {
    set(state => ({
      configurations: { ...state.configurations, [key]: value },
      unsavedChanges: new Set(state.unsavedChanges).add(key),
    }));
  },

  updateBranding: (data) => {
    set(state => ({
      branding: { ...state.branding, ...data },
      unsavedChanges: new Set(state.unsavedChanges).add('branding'),
    }));
  },

  updateFinancials: (data) => {
    set(state => ({
      financials: { ...state.financials, ...data },
      unsavedChanges: new Set(state.unsavedChanges).add('financials'),
    }));
  },

  updateEmailSettings: (data) => {
    set(state => ({
      emailSettings: { ...state.emailSettings, ...data },
      unsavedChanges: new Set(state.unsavedChanges).add('emailSettings'),
    }));
  },

  updateHotelMeta: (data) => {
    set(state => ({
      hotelMeta: { ...state.hotelMeta, ...data },
      unsavedChanges: new Set(state.unsavedChanges).add('hotelMeta'),
    }));
  },

  updateDocumentTemplate: (templateType, data) => {
    set(state => {
      const templates = [...state.documentTemplates];
      const existingIndex = templates.findIndex(t => t.template_type === templateType);
      
      if (existingIndex >= 0) {
        templates[existingIndex] = { ...templates[existingIndex], ...data };
      } else {
        templates.push({ template_type: templateType, ...data });
      }
      
      return {
        documentTemplates: templates,
        unsavedChanges: new Set(state.unsavedChanges).add(`template_${templateType}`),
      };
    });
  },

  loadHotelMeta: async () => {
    const { tenantId } = get();
    if (!tenantId) return;

    const { data: hotelMeta } = await supabase
      .from('hotel_meta')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    set({ hotelMeta: hotelMeta || {} });
  },

  saveConfig: async (key: string) => {
    const { tenantId, configurations } = get();
    if (!tenantId) return;

    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('hotel_configurations').upsert({
      tenant_id: tenantId,
      key,
      value: configurations[key],
      updated_by: user?.id,
    });

    if (error) throw error;
    get().markSaved(key);
  },

  saveBranding: async () => {
    const { tenantId, branding } = get();
    if (!tenantId) return;

    const { error } = await supabase.from('hotel_branding').upsert({
      tenant_id: tenantId,
      ...branding,
    });

    if (error) throw error;
    get().markSaved('branding');
  },

  saveFinancials: async () => {
    const { tenantId, financials } = get();
    if (!tenantId) return;

    const { error } = await supabase.from('hotel_financials').upsert({
      tenant_id: tenantId,
      ...financials,
    });

    if (error) throw error;
    get().markSaved('financials');
  },

  saveEmailSettings: async () => {
    const { tenantId, emailSettings } = get();
    if (!tenantId) return;

    const { error } = await supabase.from('email_settings').upsert({
      tenant_id: tenantId,
      ...emailSettings,
    });

    if (error) throw error;
    get().markSaved('emailSettings');
  },

  saveHotelMeta: async () => {
    const { tenantId, hotelMeta } = get();
    if (!tenantId) return;

    const { error } = await supabase.from('hotel_meta').upsert({
      tenant_id: tenantId,
      ...hotelMeta,
    });

    if (error) throw error;
    get().markSaved('hotelMeta');
  },

  saveDocumentTemplate: async (templateType: string) => {
    const { tenantId, documentTemplates } = get();
    if (!tenantId) return;

    const template = documentTemplates.find(t => t.template_type === templateType);
    if (!template) return;

    const { error } = await supabase.from('document_templates').upsert({
      tenant_id: tenantId,
      template_type: templateType,
      ...template,
    });

    if (error) throw error;
    get().markSaved(`template_${templateType}`);
  },

  saveAllChanges: async () => {
    const { unsavedChanges } = get();
    const savePromises: Promise<void>[] = [];

    if (unsavedChanges.has('branding')) savePromises.push(get().saveBranding());
    if (unsavedChanges.has('financials')) savePromises.push(get().saveFinancials());
    if (unsavedChanges.has('emailSettings')) savePromises.push(get().saveEmailSettings());
    if (unsavedChanges.has('hotelMeta')) savePromises.push(get().saveHotelMeta());

    // Save document templates
    unsavedChanges.forEach(key => {
      if (key.startsWith('template_')) {
        const templateType = key.replace('template_', '');
        savePromises.push(get().saveDocumentTemplate(templateType));
      }
    });

    // Save all other config keys
    unsavedChanges.forEach(key => {
      if (!['branding', 'financials', 'emailSettings', 'hotelMeta'].includes(key) && !key.startsWith('template_')) {
        savePromises.push(get().saveConfig(key));
      }
    });

    await Promise.all(savePromises);
    set({ lastSyncTime: new Date() });
  },

  resetChanges: () => {
    const { tenantId } = get();
    if (tenantId) {
      get().loadAllConfig(tenantId);
      set({ unsavedChanges: new Set() });
    }
  },

  markSaved: (key: string) => {
    set(state => {
      const newUnsaved = new Set(state.unsavedChanges);
      newUnsaved.delete(key);
      return { unsavedChanges: newUnsaved, lastSyncTime: new Date() };
    });
  },
}));
