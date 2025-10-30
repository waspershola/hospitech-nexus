import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConfigStore {
  tenantId: string | null;
  configurations: Record<string, any>;
  branding: any;
  financials: any;
  emailSettings: any;
  hotelMeta: any;
  documentTemplates: any[];
  unsavedChanges: string[];
  lastSyncTime: Date | null;
  isLoading: boolean;
  isSaving: boolean;
  lastError: string | null;
  version: number;
  saveCounter: number;
  
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
  unsavedChanges: [],
  lastSyncTime: null,
  isLoading: false,
  isSaving: false,
  lastError: null,
  version: 0,
  saveCounter: 0,

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
    set(state => {
      const newUnsaved = [...state.unsavedChanges];
      if (!newUnsaved.includes(key)) {
        newUnsaved.push(key);
      }
      return {
        configurations: { ...state.configurations, [key]: value },
        unsavedChanges: newUnsaved,
        version: state.version + 1,
      };
    });
  },

  updateBranding: (data) => {
    set(state => {
      const newUnsaved = [...state.unsavedChanges];
      if (!newUnsaved.includes('branding')) {
        newUnsaved.push('branding');
      }
      return {
        branding: { ...state.branding, ...data },
        unsavedChanges: newUnsaved,
        version: state.version + 1,
      };
    });
  },

  updateFinancials: (data) => {
    set(state => {
      const newUnsaved = [...state.unsavedChanges];
      if (!newUnsaved.includes('financials')) {
        newUnsaved.push('financials');
      }
      return {
        financials: { ...state.financials, ...data },
        unsavedChanges: newUnsaved,
        version: state.version + 1,
      };
    });
  },

  updateEmailSettings: (data) => {
    set(state => {
      const newUnsaved = [...state.unsavedChanges];
      if (!newUnsaved.includes('email_settings')) {
        newUnsaved.push('email_settings');
      }
      return {
        emailSettings: { ...state.emailSettings, ...data },
        unsavedChanges: newUnsaved,
        version: state.version + 1,
      };
    });
  },

  updateHotelMeta: (data) => {
    set(state => {
      const newUnsaved = [...state.unsavedChanges];
      if (!newUnsaved.includes('hotel_meta')) {
        newUnsaved.push('hotel_meta');
      }
      return {
        hotelMeta: { ...state.hotelMeta, ...data },
        unsavedChanges: newUnsaved,
        version: state.version + 1,
      };
    });
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
      
      const newUnsaved = [...state.unsavedChanges];
      const key = `template_${templateType}`;
      if (!newUnsaved.includes(key)) {
        newUnsaved.push(key);
      }
      
      return {
        documentTemplates: templates,
        unsavedChanges: newUnsaved,
        version: state.version + 1,
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

    set({ isSaving: true, lastError: null });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('hotel_configurations').upsert({
        tenant_id: tenantId,
        key,
        value: configurations[key],
        updated_by: user?.id,
      });

      if (error) throw error;
      
      set(state => ({
        unsavedChanges: state.unsavedChanges.filter(k => k !== key),
        lastSyncTime: new Date(),
        version: state.version + 1,
        saveCounter: state.saveCounter + 1,
        isSaving: false,
      }));

      toast.success('Configuration saved');
    } catch (error: any) {
      console.error('Failed to save config:', error);
      set({ lastError: error.message, isSaving: false });
      toast.error('Failed to save configuration');
      throw error;
    }
  },

  saveBranding: async () => {
    const { tenantId, branding } = get();
    if (!tenantId) return;

    set({ isSaving: true, lastError: null });

    try {
      const { error } = await supabase.from('hotel_branding').upsert({
        tenant_id: tenantId,
        ...branding,
      });

      if (error) throw error;
      
      set(state => ({
        unsavedChanges: state.unsavedChanges.filter(k => k !== 'branding'),
        lastSyncTime: new Date(),
        version: state.version + 1,
        saveCounter: state.saveCounter + 1,
        isSaving: false,
      }));

      toast.success('Branding saved');
    } catch (error: any) {
      console.error('Failed to save branding:', error);
      set({ lastError: error.message, isSaving: false });
      toast.error('Failed to save branding');
      throw error;
    }
  },

  saveFinancials: async () => {
    const { tenantId, financials } = get();
    if (!tenantId) return;

    set({ isSaving: true, lastError: null });

    try {
      const { error } = await supabase.from('hotel_financials').upsert({
        tenant_id: tenantId,
        ...financials,
      });

      if (error) throw error;
      
      set(state => ({
        unsavedChanges: state.unsavedChanges.filter(k => k !== 'financials'),
        lastSyncTime: new Date(),
        version: state.version + 1,
        saveCounter: state.saveCounter + 1,
        isSaving: false,
      }));

      toast.success('Financial settings saved');
    } catch (error: any) {
      console.error('Failed to save financials:', error);
      set({ lastError: error.message, isSaving: false });
      toast.error('Failed to save financial settings');
      throw error;
    }
  },

  saveEmailSettings: async () => {
    const { tenantId, emailSettings } = get();
    if (!tenantId) return;

    set({ isSaving: true, lastError: null });

    try {
      const { error } = await supabase.from('email_settings').upsert({
        tenant_id: tenantId,
        ...emailSettings,
      });

      if (error) throw error;
      
      set(state => ({
        unsavedChanges: state.unsavedChanges.filter(k => k !== 'email_settings'),
        lastSyncTime: new Date(),
        version: state.version + 1,
        saveCounter: state.saveCounter + 1,
        isSaving: false,
      }));

      toast.success('Email settings saved');
    } catch (error: any) {
      console.error('Failed to save email settings:', error);
      set({ lastError: error.message, isSaving: false });
      toast.error('Failed to save email settings');
      throw error;
    }
  },

  saveHotelMeta: async () => {
    const { tenantId, hotelMeta } = get();
    if (!tenantId) return;

    set({ isSaving: true, lastError: null });

    try {
      const { error } = await supabase.from('hotel_meta').upsert({
        tenant_id: tenantId,
        ...hotelMeta,
      });

      if (error) throw error;
      
      set(state => ({
        unsavedChanges: state.unsavedChanges.filter(k => k !== 'hotel_meta'),
        lastSyncTime: new Date(),
        version: state.version + 1,
        saveCounter: state.saveCounter + 1,
        isSaving: false,
      }));

      toast.success('Hotel information saved');
    } catch (error: any) {
      console.error('Failed to save hotel meta:', error);
      set({ lastError: error.message, isSaving: false });
      toast.error('Failed to save hotel information');
      throw error;
    }
  },

  saveDocumentTemplate: async (templateType: string) => {
    const { tenantId, documentTemplates } = get();
    if (!tenantId) return;

    set({ isSaving: true, lastError: null });

    try {
      const template = documentTemplates.find(t => t.template_type === templateType);
      if (!template) return;

      const { error } = await supabase.from('document_templates').upsert({
        tenant_id: tenantId,
        template_type: templateType,
        ...template,
      });

      if (error) throw error;
      
      set(state => ({
        unsavedChanges: state.unsavedChanges.filter(k => k !== `template_${templateType}`),
        lastSyncTime: new Date(),
        version: state.version + 1,
        saveCounter: state.saveCounter + 1,
        isSaving: false,
      }));

      toast.success('Document template saved');
    } catch (error: any) {
      console.error('Failed to save document template:', error);
      set({ lastError: error.message, isSaving: false });
      toast.error('Failed to save document template');
      throw error;
    }
  },

  saveAllChanges: async () => {
    const { unsavedChanges } = get();
    const savePromises: Promise<void>[] = [];

    if (unsavedChanges.includes('branding')) savePromises.push(get().saveBranding());
    if (unsavedChanges.includes('financials')) savePromises.push(get().saveFinancials());
    if (unsavedChanges.includes('email_settings')) savePromises.push(get().saveEmailSettings());
    if (unsavedChanges.includes('hotel_meta')) savePromises.push(get().saveHotelMeta());

    // Save document templates
    unsavedChanges.forEach(key => {
      if (key.startsWith('template_')) {
        const templateType = key.replace('template_', '');
        savePromises.push(get().saveDocumentTemplate(templateType));
      }
    });

    // Save all other config keys
    unsavedChanges.forEach(key => {
      if (!['branding', 'financials', 'email_settings', 'hotel_meta'].includes(key) && !key.startsWith('template_')) {
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
      set({ unsavedChanges: [] });
    }
  },

  markSaved: (key: string) => {
    set(state => ({
      unsavedChanges: state.unsavedChanges.filter(k => k !== key),
      lastSyncTime: new Date(),
    }));
  },
}));
