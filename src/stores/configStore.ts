import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Utility functions for camelCase <-> snake_case conversion
const camelToSnake = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

const snakeToCamel = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

const convertObjectKeys = (obj: any, converter: (key: string) => string): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => convertObjectKeys(item, converter));
  
  const converted: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = converter(key);
      converted[newKey] = convertObjectKeys(obj[key], converter);
    }
  }
  return converted;
};

interface ConfigStore {
  tenantId: string | null;
  configurations: Record<string, any>;
  branding: any;
  emailSettings: any;
  hotelMeta: any;
  documentTemplates: any[];
  unsavedChanges: string[];
  lastSyncTime: Date | null;
  sectionLastSaved: Record<string, Date>;
  isLoading: boolean;
  isSaving: boolean;
  savingProgress: { section: string; status: 'saving' | 'success' | 'error' }[];
  lastError: string | null;
  sectionErrors: Record<string, string>;
  version: number;
  saveCounter: number;
  
  // Actions
  setTenantId: (tenantId: string) => void;
  loadAllConfig: (tenantId: string) => Promise<void>;
  loadHotelMeta: () => Promise<void>;
  updateConfig: (key: string, value: any) => void;
  updateBranding: (data: any) => void;
  updateEmailSettings: (data: any) => void;
  updateHotelMeta: (data: any) => void;
  updateDocumentTemplate: (templateType: string, data: any) => void;
  saveConfig: (key: string) => Promise<void>;
  saveBranding: () => Promise<void>;
  saveEmailSettings: () => Promise<void>;
  saveHotelMeta: () => Promise<void>;
  saveDocumentTemplate: (templateType: string) => Promise<void>;
  saveAllChanges: () => Promise<void>;
  resetChanges: () => void;
  markSaved: (key: string) => void;
  clearAllUnsaved: () => void;
  hasUnsaved: (key: string) => boolean;
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  tenantId: null,
  configurations: {},
  branding: {},
  emailSettings: {},
  hotelMeta: {},
  documentTemplates: [],
  unsavedChanges: [],
  lastSyncTime: null,
  sectionLastSaved: {},
  isLoading: false,
  isSaving: false,
  savingProgress: [],
  lastError: null,
  sectionErrors: {},
  version: 0,
  saveCounter: 0,

  setTenantId: (tenantId) => set({ tenantId }),

  loadAllConfig: async (tenantId: string) => {
    set({ isLoading: true, unsavedChanges: [], sectionErrors: {} });
    try {
      // Load general configurations
      const { data: configs } = await supabase
        .from('hotel_configurations')
        .select('key, value')
        .eq('tenant_id', tenantId);

      const configurationsMap: Record<string, any> = {};
      const generalConfig: Record<string, any> = {};
      
      configs?.forEach(config => {
        // Parse JSON strings back to values
        let parsedValue = config.value;
        if (typeof config.value === 'string') {
          try {
            parsedValue = JSON.parse(config.value);
          } catch {
            parsedValue = config.value;
          }
        }
        
        // Convert snake_case from DB to camelCase for UI
        const camelKey = snakeToCamel(config.key);
        
        // Group certain fields under 'general'
        const generalFields = ['hotelName', 'timezone', 'dateFormat', 'phone', 'email', 
                              'website', 'address', 'city', 'state', 'country', 
                              'allowCheckoutWithoutPayment', 'checkInTime', 'checkOutTime'];
        
        if (generalFields.includes(camelKey)) {
          generalConfig[camelKey] = parsedValue;
        } else {
          configurationsMap[camelKey] = parsedValue;
        }
      });
      
      // Add general config as a single object
      if (Object.keys(generalConfig).length > 0) {
        configurationsMap.general = generalConfig;
      }

      // Load branding
      const { data: branding } = await supabase
        .from('hotel_branding')
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
        emailSettings: emailSettings || {},
        hotelMeta: hotelMeta || {},
        documentTemplates: documentTemplates || [],
        isLoading: false,
        unsavedChanges: [],
        sectionErrors: {},
        version: get().version + 1,
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
    
    console.log('🔘 saveConfig called with key:', key);
    console.log('📦 Current configurations:', configurations);
    console.log('🏢 Tenant ID:', tenantId);
    
    if (!tenantId) {
      console.error('❌ No tenant ID - aborting save');
      return;
    }

    set({ isSaving: true, lastError: null, sectionErrors: { ...get().sectionErrors, [key]: '' } });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 Current user:', user?.id);
      
      // If key is 'general', save each field as separate configuration
      if (key === 'general' && typeof configurations[key] === 'object') {
        const generalConfig = configurations[key];
        
        console.log('💾 Saving general config with fields:', Object.keys(generalConfig));
        console.log('💾 Full general config object:', JSON.stringify(generalConfig, null, 2));
        
        // Save each general config field separately (convert to snake_case)
        const saveResults = [];
        for (const [fieldKey, fieldValue] of Object.entries(generalConfig)) {
          const snakeKey = camelToSnake(fieldKey);
          
          console.log(`  📝 [${fieldKey}] → [${snakeKey}] = ${JSON.stringify(fieldValue)}`);
          
          const payload = {
            tenant_id: tenantId,
            key: snakeKey,
            value: fieldValue as any,
            updated_by: user?.id,
          };
          
          console.log('  💌 Payload to upsert:', JSON.stringify(payload, null, 2));
          
          const result = await supabase
            .from('hotel_configurations')
            .upsert([payload], {
              onConflict: 'tenant_id,key'
            })
            .select();
          
          console.log(`  ↩️ Upsert result for ${snakeKey}:`, {
            status: result.status,
            error: result.error,
            data: result.data,
          });
          
          if (result.error) {
            console.error(`  ❌ Error saving ${snakeKey}:`, result.error);
          } else {
            console.log(`  ✅ Successfully saved ${snakeKey}`);
          }
          
          saveResults.push(result);
        }
        
        const errors = saveResults.filter(r => r.error);
        
        if (errors.length > 0) {
          console.error('❌ Save errors:', errors);
          throw errors[0].error;
        }
        
        console.log('✅ All general config fields saved successfully');
      } else {
        // Single key-value save (convert to snake_case)
        const snakeKey = camelToSnake(key);
        console.log(`💾 Saving ${key} as ${snakeKey}:`, configurations[key]);
        
        const payload = {
          tenant_id: tenantId,
          key: snakeKey,
          value: configurations[key] as any,
          updated_by: user?.id,
        };
        
        console.log('💌 Payload to upsert:', JSON.stringify(payload, null, 2));
        
        const { data, error, status } = await supabase
          .from('hotel_configurations')
          .upsert([payload], {
            onConflict: 'tenant_id,key'
          })
          .select()
          .single();

        console.log('↩️ Upsert result:', { status, error, data });

        if (error) {
          console.error(`❌ Error saving ${key}:`, error);
          throw error;
        }
        
        console.log(`✅ ${key} saved successfully`);
      }
      
      const now = new Date();
      console.log('🎯 Updating state - removing from unsavedChanges:', key);
      
      // Force new array reference to trigger reactivity
      set(state => {
        const newUnsavedChanges = state.unsavedChanges.filter(k => k !== key);
        console.log('  📊 unsavedChanges before:', state.unsavedChanges);
        console.log('  📊 unsavedChanges after:', newUnsavedChanges);
        
        return {
          unsavedChanges: [...newUnsavedChanges],
          lastSyncTime: now,
          sectionLastSaved: { ...state.sectionLastSaved, [key]: now },
          version: state.version + 1,
          saveCounter: state.saveCounter + 1,
          isSaving: false,
        };
      });

      console.log('🎉 Showing success toast');
      toast.success('Configuration saved');
      console.log('✅ Save operation completed successfully');
    } catch (error: any) {
      console.error('🔥 Exception during save:', error);
      console.error('🔥 Error details:', JSON.stringify(error, null, 2));
      
      set({ 
        lastError: error.message,
        sectionErrors: { ...get().sectionErrors, [key]: error.message },
        isSaving: false,
      });
      
      console.log('⚠️ Showing error toast');
      toast.error('Failed to save configuration: ' + (error.message || 'Unknown error'));
      throw error;
    }
  },

  saveBranding: async () => {
    const { tenantId, branding } = get();
    if (!tenantId) throw new Error('No tenant ID');

    set({ isSaving: true, lastError: null, sectionErrors: { ...get().sectionErrors, branding: '' } });

    try {
      // Get existing record to obtain ID
      const { data: existing } = await supabase
        .from('hotel_branding')
        .select('id')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      // Upsert with ID for proper update
      const { data, error } = await supabase
        .from('hotel_branding')
        .upsert({
          ...(existing?.id && { id: existing.id }),
          tenant_id: tenantId,
          ...branding,
        }, {
          onConflict: 'tenant_id'
        })
        .select()
        .single();

      if (error) throw error;
      
      const now = new Date();
      set(state => ({
        branding: data,
        unsavedChanges: state.unsavedChanges.filter(k => k !== 'branding'),
        lastSyncTime: now,
        sectionLastSaved: { ...state.sectionLastSaved, branding: now },
        version: state.version + 1,
        saveCounter: state.saveCounter + 1,
        isSaving: false,
      }));

      toast.success('Branding saved');
    } catch (error: any) {
      console.error('Failed to save branding:', error);
      set({ 
        lastError: error.message, 
        sectionErrors: { ...get().sectionErrors, branding: error.message }
      });
      toast.error('Failed to save branding');
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  saveEmailSettings: async () => {
    const { tenantId, emailSettings } = get();
    if (!tenantId) throw new Error('No tenant ID');

    set({ isSaving: true, lastError: null, sectionErrors: { ...get().sectionErrors, email_settings: '' } });

    try {
      // Get existing record to obtain ID
      const { data: existing } = await supabase
        .from('email_settings')
        .select('id')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      // Upsert with ID for proper update
      const { data, error } = await supabase
        .from('email_settings')
        .upsert({
          ...(existing?.id && { id: existing.id }),
          tenant_id: tenantId,
          ...emailSettings,
        }, {
          onConflict: 'tenant_id'
        })
        .select()
        .single();

      if (error) throw error;
      
      const now = new Date();
      set(state => ({
        emailSettings: data,
        unsavedChanges: state.unsavedChanges.filter(k => k !== 'email_settings'),
        lastSyncTime: now,
        sectionLastSaved: { ...state.sectionLastSaved, email_settings: now },
        version: state.version + 1,
        saveCounter: state.saveCounter + 1,
        isSaving: false,
      }));

      toast.success('Email settings saved');
    } catch (error: any) {
      console.error('Failed to save email settings:', error);
      set({ 
        lastError: error.message,
        sectionErrors: { ...get().sectionErrors, email_settings: error.message }
      });
      toast.error('Failed to save email settings');
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  saveHotelMeta: async () => {
    const { tenantId, hotelMeta } = get();
    if (!tenantId) throw new Error('No tenant ID');

    set({ isSaving: true, lastError: null, sectionErrors: { ...get().sectionErrors, hotel_meta: '' } });

    try {
      // Get existing record to obtain ID
      const { data: existing } = await supabase
        .from('hotel_meta')
        .select('id')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      // Upsert with ID for proper update
      const { data, error } = await supabase
        .from('hotel_meta')
        .upsert({
          ...(existing?.id && { id: existing.id }),
          tenant_id: tenantId,
          ...hotelMeta,
        }, {
          onConflict: 'tenant_id'
        })
        .select()
        .single();

      if (error) throw error;
      
      const now = new Date();
      set(state => ({
        hotelMeta: data,
        unsavedChanges: state.unsavedChanges.filter(k => k !== 'hotel_meta'),
        lastSyncTime: now,
        sectionLastSaved: { ...state.sectionLastSaved, hotel_meta: now },
        version: state.version + 1,
        saveCounter: state.saveCounter + 1,
        isSaving: false,
      }));

      toast.success('Hotel information saved');
    } catch (error: any) {
      console.error('Failed to save hotel meta:', error);
      set({ 
        lastError: error.message,
        sectionErrors: { ...get().sectionErrors, hotel_meta: error.message }
      });
      toast.error('Failed to save hotel information');
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  saveDocumentTemplate: async (templateType: string) => {
    const { tenantId, documentTemplates } = get();
    if (!tenantId) throw new Error('No tenant ID');

    const key = `template_${templateType}`;
    set({ isSaving: true, lastError: null, sectionErrors: { ...get().sectionErrors, [key]: '' } });

    try {
      const template = documentTemplates.find(t => t.template_type === templateType);
      if (!template) throw new Error('Template not found');

      // Get existing record to obtain ID
      const { data: existing } = await supabase
        .from('document_templates')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('template_type', templateType)
        .maybeSingle();

      // Upsert with ID for proper update
      const { data, error } = await supabase
        .from('document_templates')
        .upsert({
          ...(existing?.id && { id: existing.id }),
          tenant_id: tenantId,
          template_type: templateType,
          ...template,
        }, {
          onConflict: 'tenant_id,template_type'
        })
        .select()
        .single();

      if (error) throw error;
      
      const now = new Date();
      set(state => ({
        documentTemplates: state.documentTemplates.map(t => 
          t.template_type === templateType ? data : t
        ),
        unsavedChanges: state.unsavedChanges.filter(k => k !== key),
        lastSyncTime: now,
        sectionLastSaved: { ...state.sectionLastSaved, [key]: now },
        version: state.version + 1,
        saveCounter: state.saveCounter + 1,
        isSaving: false,
      }));

      toast.success('Document template saved');
    } catch (error: any) {
      console.error('Failed to save document template:', error);
      set({ 
        lastError: error.message,
        sectionErrors: { ...get().sectionErrors, [key]: error.message }
      });
      toast.error('Failed to save document template');
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  saveAllChanges: async () => {
    const { unsavedChanges } = get();
    if (unsavedChanges.length === 0) {
      toast.info('No changes to save');
      return;
    }

    set({ isSaving: true, savingProgress: [] });
    const errors: Array<{ section: string; error: string }> = [];
    let successCount = 0;

    // Process each section sequentially with error handling
    for (const key of unsavedChanges) {
      set(state => ({
        savingProgress: [...state.savingProgress, { section: key, status: 'saving' }]
      }));

      try {
        if (key === 'branding') {
          await get().saveBranding();
        } else if (key === 'email_settings') {
          await get().saveEmailSettings();
        } else if (key === 'hotel_meta') {
          await get().saveHotelMeta();
        } else if (key.startsWith('template_')) {
          const templateType = key.replace('template_', '');
          await get().saveDocumentTemplate(templateType);
        } else {
          await get().saveConfig(key);
        }

        set(state => ({
          savingProgress: state.savingProgress.map(p =>
            p.section === key ? { ...p, status: 'success' } : p
          )
        }));
        successCount++;
      } catch (error: any) {
        errors.push({ section: key, error: error.message });
        set(state => ({
          savingProgress: state.savingProgress.map(p =>
            p.section === key ? { ...p, status: 'error' } : p
          )
        }));
      }
    }

    set({ isSaving: false, lastSyncTime: new Date() });

    // Clear progress after a delay
    setTimeout(() => {
      set({ savingProgress: [] });
    }, 3000);

    if (errors.length > 0) {
      const errorMsg = errors.map(e => `${e.section}: ${e.error}`).join('; ');
      toast.error(`Failed to save ${errors.length} section(s): ${errorMsg}`);
    } else {
      toast.success(`All ${successCount} section(s) saved successfully`);
    }
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

  clearAllUnsaved: () => set({ unsavedChanges: [], sectionErrors: {} }),

  hasUnsaved: (key: string) => get().unsavedChanges.includes(key),
}));
