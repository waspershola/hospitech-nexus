import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback, useRef } from 'react';

interface NotificationSound {
  id: string;
  tenant_id: string;
  name: string;
  category: string;
  file_path: string;
  is_default: boolean;
}

export function useNotificationSound() {
  const { tenantId } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch notification sounds for the tenant
  const { data: sounds = [] } = useQuery({
    queryKey: ['notification-sounds', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('notification_sounds')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_default', true);

      if (error) throw error;
      return (data || []) as NotificationSound[];
    },
    enabled: !!tenantId,
  });

  const playSound = useCallback(async (category: string = 'qr_request') => {
    try {
      console.log('[NotificationSound] Playing sound for category:', category);
      
      // Find sound for this category
      const sound = sounds.find(s => s.category === category);
      
      if (!sound) {
        console.log('[NotificationSound] No sound configured for category:', category);
        // Fallback to default notification sound
        playDefaultSound();
        return;
      }

      console.log('[NotificationSound] Found sound:', sound.name, sound.file_path);

      // Get public URL for the sound file
      const { data: urlData } = supabase.storage
        .from('notification-sounds')
        .getPublicUrl(sound.file_path);

      if (!urlData?.publicUrl) {
        console.error('[NotificationSound] Failed to get public URL');
        playDefaultSound();
        return;
      }

      console.log('[NotificationSound] Playing audio from:', urlData.publicUrl);

      // Create or reuse audio element
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      audioRef.current.src = urlData.publicUrl;
      audioRef.current.volume = 0.7;

      // Play the sound
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('[NotificationSound] Sound played successfully');
          })
          .catch((error) => {
            console.error('[NotificationSound] Error playing sound:', error);
            // Try fallback
            playDefaultSound();
          });
      }
    } catch (error) {
      console.error('[NotificationSound] Error in playSound:', error);
      playDefaultSound();
    }
  }, [sounds]);

  const playDefaultSound = useCallback(() => {
    try {
      console.log('[NotificationSound] Playing default notification sound');
      
      // Use Web Audio API to generate a simple notification beep
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Create a pleasant notification sound (C5 note)
      oscillator.frequency.value = 523.25;
      oscillator.type = 'sine';

      // Fade in/out envelope
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);

      console.log('[NotificationSound] Default beep played');
    } catch (error) {
      console.error('[NotificationSound] Error playing default sound:', error);
    }
  }, []);

  return { playSound, playDefaultSound };
}
