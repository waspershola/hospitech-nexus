import { useState, useEffect, useRef } from 'react';

interface RingtoneOptions {
  volume?: number;
  loop?: boolean;
}

export function useRingtone() {
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('notifications_muted');
    return saved === 'true';
  });
  
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('notification_volume');
    return saved ? parseFloat(saved) : 0.7;
  });

  const [permissionGranted, setPermissionGranted] = useState(() => {
    return localStorage.getItem('audio_permission_granted') === 'true';
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create single audio instance on mount
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/sounds/notification-default.mp3');
      audioRef.current.preload = 'auto';
      audioRef.current.volume = volume;
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('notifications_muted', String(isMuted));
  }, [isMuted]);

  useEffect(() => {
    localStorage.setItem('notification_volume', String(volume));
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const playRingtone = async (soundPath: string = '/sounds/notification-default.mp3', options: RingtoneOptions = {}) => {
    if (isMuted || !audioRef.current) return;

    try {
      // Update source if changed
      if (audioRef.current.src !== soundPath && !audioRef.current.src.endsWith(soundPath)) {
        audioRef.current.src = soundPath;
      }
      
      audioRef.current.currentTime = 0;
      audioRef.current.volume = options.volume ?? volume;
      audioRef.current.loop = options.loop ?? false;
      
      const playPromise = audioRef.current.play();
      
      await playPromise;
      
      // First successful play - save permission
      if (!permissionGranted) {
        localStorage.setItem('audio_permission_granted', 'true');
        setPermissionGranted(true);
      }
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        console.warn('⚠️ Audio autoplay blocked. User interaction required.');
      } else {
        console.error('Error playing ringtone:', error);
      }
    }
  };

  const requestPermission = async () => {
    if (!audioRef.current) return false;
    
    try {
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      localStorage.setItem('audio_permission_granted', 'true');
      setPermissionGranted(true);
      return true;
    } catch {
      return false;
    }
  };

  const stopRingtone = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return {
    playRingtone,
    stopRingtone,
    isMuted,
    toggleMute,
    volume,
    setVolume,
    permissionGranted,
    requestPermission,
  };
}
