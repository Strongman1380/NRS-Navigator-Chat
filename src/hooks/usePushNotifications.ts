import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '../lib/supabase';

export function usePushNotifications(userId: string | undefined, isAdmin: boolean) {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!userId || !isAdmin || registeredRef.current) return;
    if (!Capacitor.isNativePlatform()) return;

    const setup = async () => {
      try {
        // Request permission
        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive !== 'granted') {
          console.log('Push notification permission not granted');
          return;
        }

        // Register for push notifications
        await PushNotifications.register();

        // Listen for registration token
        PushNotifications.addListener('registration', async (token) => {
          console.log('Push registration token:', token.value);
          // Store token in Supabase for this admin user
          await supabase.from('push_tokens').upsert(
            {
              user_id: userId,
              token: token.value,
              platform: Capacitor.getPlatform(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );
          registeredRef.current = true;
        });

        // Handle registration errors
        PushNotifications.addListener('registrationError', (error) => {
          console.error('Push registration error:', error);
        });

        // Handle incoming notifications while app is in foreground
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push notification received:', notification);
        });

        // Handle notification tap (when app was in background)
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push notification action:', notification);
        });
      } catch (err) {
        console.error('Push notification setup error:', err);
      }
    };

    setup();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [userId, isAdmin]);
}
