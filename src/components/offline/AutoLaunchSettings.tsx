/**
 * OFFLINE-DESKTOP-V1: Auto-launch settings component
 * Allows users to enable/disable auto-launch on Windows startup
 */

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Power } from 'lucide-react';

export function AutoLaunchSettings() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load initial state
  useEffect(() => {
    if (!window.electronAPI) {
      setLoading(false);
      return;
    }

    window.electronAPI.getAutoLaunchEnabled().then(isEnabled => {
      setEnabled(isEnabled);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  const handleToggle = async (checked: boolean) => {
    if (!window.electronAPI) return;

    setLoading(true);
    try {
      await window.electronAPI.setAutoLaunchEnabled(checked);
      setEnabled(checked);
      toast.success(
        checked 
          ? 'Auto-launch enabled - app will start with Windows' 
          : 'Auto-launch disabled'
      );
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update auto-launch setting');
    } finally {
      setLoading(false);
    }
  };

  // Don't render if not in Electron
  if (!window.electronAPI) {
    return null;
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Power className="h-5 w-5 text-primary" />
          </div>
          <div>
            <Label htmlFor="auto-launch" className="text-base font-medium cursor-pointer">
              Launch on Startup
            </Label>
            <p className="text-sm text-muted-foreground mt-0.5">
              Automatically start LuxuryHotelPro when Windows starts
            </p>
          </div>
        </div>
        <Switch
          id="auto-launch"
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={loading}
        />
      </div>
    </Card>
  );
}
