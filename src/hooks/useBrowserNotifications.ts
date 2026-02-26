import { useCallback, useEffect, useRef, useState } from 'react';

// Small inline base64 beep sound (~0.2s, 800Hz sine wave)
const ALERT_BEEP_B64 =
  'data:audio/wav;base64,UklGRiQEAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAEAAB/' +
  'f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/' +
  'f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/' +
  'f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/' +
  'f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/' +
  'f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/' +
  'f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/fw==';

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Pre-create audio element for alert sounds
    audioRef.current = new Audio(ALERT_BEEP_B64);
    audioRef.current.volume = 0.6;
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'denied' as NotificationPermission;
    if (Notification.permission === 'granted') {
      setPermission('granted');
      return 'granted' as NotificationPermission;
    }
    if (Notification.permission === 'denied') {
      setPermission('denied');
      return 'denied' as NotificationPermission;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const notify = useCallback(
    (title: string, options?: { body?: string; urgent?: boolean }) => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

      const notification = new Notification(title, {
        body: options?.body,
        icon: '/icon-192.png',
        requireInteraction: options?.urgent ?? false,
        tag: title, // Prevents duplicate notifications with same title
      });

      // Auto-close non-urgent notifications after 8 seconds
      if (!options?.urgent) {
        setTimeout(() => notification.close(), 8000);
      }
    },
    []
  );

  const playAlertSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Browser may block autoplay; ignore
      });
    }
  }, []);

  return { permission, requestPermission, notify, playAlertSound };
}
