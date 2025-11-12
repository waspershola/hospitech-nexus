import { useState } from 'react';
import { useRingtone } from '@/hooks/useRingtone';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Volume2 } from 'lucide-react';

export function AudioPermissionPrompt() {
  const { permissionGranted, requestPermission } = useRingtone();
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('audio_permission_prompt_dismissed') === 'true';
  });

  const handleEnable = async () => {
    const granted = await requestPermission();
    if (granted) {
      setDismissed(true);
      localStorage.setItem('audio_permission_prompt_dismissed', 'true');
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('audio_permission_prompt_dismissed', 'true');
  };

  if (permissionGranted || dismissed) return null;

  return (
    <Alert className="fixed bottom-4 right-4 w-96 z-50 border-primary">
      <Volume2 className="h-4 w-4" />
      <AlertTitle>Enable Notification Sounds?</AlertTitle>
      <AlertDescription className="space-y-2">
        <p className="text-sm">Get instant audio alerts for new QR requests and guest messages.</p>
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
