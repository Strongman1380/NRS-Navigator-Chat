import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (c) => c.charCodeAt(0));
}

export type WebPushStatus = 'idle' | 'subscribing' | 'subscribed' | 'denied' | 'unsupported';

export function useWebPush(enabled: boolean) {
  const [status, setStatus] = useState<WebPushStatus>('idle');
  const registered = useRef(false);

  useEffect(() => {
    if (!enabled || registered.current) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      console.warn('useWebPush: VITE_VAPID_PUBLIC_KEY not set — web push disabled');
      return;
    }

    async function subscribe() {
      setStatus('subscribing');
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setStatus('denied');
          return;
        }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
        });

        const json = sub.toJSON() as {
          endpoint: string;
          keys: { p256dh: string; auth: string };
        };

        await supabase.from('web_push_subscriptions').upsert(
          { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
          { onConflict: 'endpoint' }
        );

        registered.current = true;
        setStatus('subscribed');
      } catch (e) {
        console.error('Web push subscription failed:', e);
        setStatus('idle');
      }
    }

    subscribe();
  }, [enabled]);

  return { status };
}
