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

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    localStorage.setItem('notifications_muted', String(isMuted));
  }, [isMuted]);

  useEffect(() => {
    localStorage.setItem('notification_volume', String(volume));
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const playRingtone = (soundPath: string = '/sounds/notification-default.mp3', options: RingtoneOptions = {}) => {
    if (isMuted) return;

    try {
      // Stop any currently playing sound
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      const audio = new Audio(soundPath);
      audio.volume = options.volume ?? volume;
      audio.loop = options.loop ?? false;
      
      audioRef.current = audio;
      
      audio.play().catch(err => {
        console.error('Failed to play notification sound:', err);
      });
    } catch (error) {
      console.error('Error playing ringtone:', error);
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
  };
}
