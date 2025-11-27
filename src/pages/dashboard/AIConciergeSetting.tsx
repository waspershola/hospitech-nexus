import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Save, RotateCcw, Sparkles } from 'lucide-react';

interface AISettings {
  id: string;
  tenant_id: string;
  staff_language_preference: string;
  ai_behavior_prompt: string | null;
  welcome_message_template: string;
  translation_prompt_template: string | null;
  ai_response_style: 'luxury' | 'formal' | 'casual';
  enable_auto_translation: boolean;
  enable_ai_auto_responses: boolean;
  enable_ai_suggestions: boolean;
}

export default function AIConciergeSetting() {
  const { user, tenantId } = useAuth();
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenantId) {
      fetchSettings();
    }
  }, [tenantId]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tenant_ai_settings')
        .select('*')
        .eq('tenant_id', tenantId!)
        .single();

      if (error) throw error;
      if (data) {
        setSettings({
          id: data.id,
          tenant_id: data.tenant_id,
          staff_language_preference: data.staff_language_preference,
          ai_behavior_prompt: data.ai_behavior_prompt,
          welcome_message_template: data.welcome_message_template,
          translation_prompt_template: data.translation_prompt_template,
          ai_response_style: data.ai_response_style as 'luxury' | 'formal' | 'casual',
          enable_auto_translation: data.enable_auto_translation,
          enable_ai_auto_responses: data.enable_ai_auto_responses,
          enable_ai_suggestions: data.enable_ai_suggestions,
        });
      }
    } catch (error: any) {
      console.error('Error fetching AI settings:', error);
      toast.error('Failed to load AI settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('tenant_ai_settings')
        .upsert({
          tenant_id: tenantId!,
          staff_language_preference: settings.staff_language_preference,
          ai_behavior_prompt: settings.ai_behavior_prompt,
          welcome_message_template: settings.welcome_message_template,
          translation_prompt_template: settings.translation_prompt_template,
          ai_response_style: settings.ai_response_style,
          enable_auto_translation: settings.enable_auto_translation,
          enable_ai_auto_responses: settings.enable_ai_auto_responses,
          enable_ai_suggestions: settings.enable_ai_suggestions,
        })
        .eq('tenant_id', tenantId!);

      if (error) throw error;
      toast.success('AI settings saved successfully');
    } catch (error: any) {
      console.error('Error saving AI settings:', error);
      toast.error('Failed to save AI settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    fetchSettings();
    toast.info('Settings reset to last saved values');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <Sparkles className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">No AI settings found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">AI Concierge Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure AI behavior, translations, and response styles for guest communications
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Language Preferences</CardTitle>
          <CardDescription>
            Set your hotel's operational language for staff communications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff-language">Staff Language</Label>
            <Select
              value={settings.staff_language_preference}
              onValueChange={(value) => setSettings({ ...settings, staff_language_preference: value })}
            >
              <SelectTrigger id="staff-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">Arabic</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="zh">Chinese</SelectItem>
                <SelectItem value="ja">Japanese</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Guest messages will be translated to this language for staff viewing
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Response Style</CardTitle>
          <CardDescription>
            Choose the tone and style for AI-generated responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="response-style">Response Style</Label>
            <Select
              value={settings.ai_response_style}
              onValueChange={(value: 'luxury' | 'formal' | 'casual') =>
                setSettings({ ...settings, ai_response_style: value })
              }
            >
              <SelectTrigger id="response-style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="luxury">Luxury (Warm, Elegant, Premium)</SelectItem>
                <SelectItem value="formal">Formal (Professional, Courteous)</SelectItem>
                <SelectItem value="casual">Casual (Friendly, Approachable)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom AI Behavior</CardTitle>
          <CardDescription>
            Define custom instructions for how the AI should behave
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ai-prompt">AI Behavior Prompt</Label>
            <Textarea
              id="ai-prompt"
              placeholder="e.g., Always prioritize guest comfort, be proactive with recommendations..."
              value={settings.ai_behavior_prompt || ''}
              onChange={(e) => setSettings({ ...settings, ai_behavior_prompt: e.target.value })}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Optional: Add specific instructions for AI behavior
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcome-template">Welcome Message Template</Label>
            <Textarea
              id="welcome-template"
              value={settings.welcome_message_template}
              onChange={(e) => setSettings({ ...settings, welcome_message_template: e.target.value })}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              First message guests receive when starting a conversation
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature Toggles</CardTitle>
          <CardDescription>
            Enable or disable AI features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Translation</Label>
              <p className="text-sm text-muted-foreground">
                Automatically translate messages between guest and staff languages
              </p>
            </div>
            <Switch
              checked={settings.enable_auto_translation}
              onCheckedChange={(checked) => setSettings({ ...settings, enable_auto_translation: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>AI Auto-Responses</Label>
              <p className="text-sm text-muted-foreground">
                Let AI automatically respond to common questions (FAQ matching)
              </p>
            </div>
            <Switch
              checked={settings.enable_ai_auto_responses}
              onCheckedChange={(checked) => setSettings({ ...settings, enable_ai_auto_responses: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>AI Suggestions</Label>
              <p className="text-sm text-muted-foreground">
                Show AI-generated reply suggestions to staff
              </p>
            </div>
            <Switch
              checked={settings.enable_ai_suggestions}
              onCheckedChange={(checked) => setSettings({ ...settings, enable_ai_suggestions: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
        <Button onClick={handleReset} variant="outline" disabled={saving}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>
    </div>
  );
}
