import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useRingtone } from '@/hooks/useRingtone';
import { Volume2, VolumeX, Play } from 'lucide-react';
import { toast } from 'sonner';

export function NotificationSettingsTab() {
  const { tenantId } = useAuth();
  const { isMuted, toggleMute, volume, setVolume, playRingtone } = useRingtone();

  const { data: sounds } = useQuery({
    queryKey: ['notification-sounds', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_sounds')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('is_default', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const handleTestSound = (soundPath: string) => {
    playRingtone(soundPath, { volume: volume });
    toast.success('Playing test sound');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Notification Settings</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Configure how you receive notifications for QR requests and other events.
        </p>
      </div>

      {/* Sound Controls */}
      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Enable Sounds</Label>
              <p className="text-sm text-muted-foreground">
                Play notification sounds for new requests
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isMuted ? (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Volume2 className="h-4 w-4 text-foreground" />
              )}
              <Switch checked={!isMuted} onCheckedChange={toggleMute} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Volume</Label>
              <span className="text-sm text-muted-foreground">
                {Math.round(volume * 100)}%
              </span>
            </div>
            <Slider
              value={[volume * 100]}
              onValueChange={([val]) => setVolume(val / 100)}
              max={100}
              step={1}
              disabled={isMuted}
              className="w-full"
            />
          </div>
        </div>
      </Card>

      {/* Ringtone Library */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Ringtone Library</h4>
            <p className="text-sm text-muted-foreground">
              Choose which sound to play for different notification types
            </p>
          </div>

          <div className="space-y-3">
            {sounds?.map((sound) => (
              <div
                key={sound.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium text-sm">{sound.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {sound.category.replace('_', ' ').toUpperCase()}
                    </p>
                  </div>
                  {sound.is_default && (
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      Default
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestSound(sound.file_path)}
                  disabled={isMuted}
                >
                  <Play className="h-3 w-3 mr-1" />
                  Test
                </Button>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Notification Types */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Notification Types</h4>
            <p className="text-sm text-muted-foreground">
              Control which events trigger notifications
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>QR Service Requests</Label>
                <p className="text-xs text-muted-foreground">
                  Guest requests from QR codes
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Menu Orders</Label>
                <p className="text-xs text-muted-foreground">
                  New food & beverage orders
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Guest Messages</Label>
                <p className="text-xs text-muted-foreground">
                  New messages from guests
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
