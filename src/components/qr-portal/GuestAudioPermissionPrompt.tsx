import { useState } from 'react';
import { useRingtone } from '@/hooks/useRingtone';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bell } from 'lucide-react';

export function GuestAudioPermissionPrompt() {
  const { permissionGranted, requestPermission } = useRingtone();
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('guest_audio_permission_prompt_dismissed') === 'true';
  });

  const handleEnable = async () => {
    console.log('[GUEST-AUDIO-PERMISSION] Requesting audio permission...');
    const granted = await requestPermission();
    console.log('[GUEST-AUDIO-PERMISSION] Permission granted:', granted);
    if (granted) {
      setDismissed(true);
      localStorage.setItem('guest_audio_permission_prompt_dismissed', 'true');
    }
  };

  const handleDismiss = () => {
    console.log('[GUEST-AUDIO-PERMISSION] User dismissed prompt');
    setDismissed(true);
    localStorage.setItem('guest_audio_permission_prompt_dismissed', 'true');
  };

  if (permissionGranted || dismissed) return null;

  return (
    <Alert className="fixed bottom-4 right-4 w-96 z-50 border-primary bg-background shadow-lg">
      <Bell className="h-4 w-4" />
      <AlertTitle>Enable Notifications?</AlertTitle>
      <AlertDescription className="space-y-2">
        <p className="text-sm">Get instant alerts when hotel staff replies to your requests.</p>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleEnable}>
            Enable Sounds
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDismiss}>
            Not Now
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
