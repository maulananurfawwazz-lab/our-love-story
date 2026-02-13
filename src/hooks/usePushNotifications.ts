// ═══════════════════════════════════════════════════════════════
// usePushNotifications – Push subscription hook
// Handles: registration, subscription, permission, iOS detection
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// VAPID public key (generated via web-push)
const VAPID_PUBLIC_KEY = 'BLoqla-8s-ZhjV2MTQ4PHxwCeUlmtUQXIyDRo2qGw-j3Ij-Dz9tOn4jGn3LutJ20jg3Y9oukuPPGRfpzUWGdmFM';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

export interface UsePushReturn {
  permission: PushPermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  isIOS: boolean;
  isPWA: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<void>;
}

export function usePushNotifications(): UsePushReturn {
  const { user, profile } = useAuth();
  const [permission, setPermission] = useState<PushPermissionState>('prompt');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const subscriptionRef = useRef<PushSubscription | null>(null);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isPWA = window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true;

  // Check if push is supported
  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;

  // Detect current state
  useEffect(() => {
    if (!isSupported) {
      setPermission('unsupported');
      setIsLoading(false);
      return;
    }

    const checkState = async () => {
      try {
        const currentPermission = Notification.permission;
        setPermission(currentPermission === 'default' ? 'prompt' : currentPermission as PushPermissionState);

        if (currentPermission === 'granted') {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            subscriptionRef.current = sub;
            setIsSubscribed(true);
          }
        }
      } catch (err) {
        console.error('[Push] Error checking state:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkState();
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user || !profile?.couple_id) return false;

    try {
      setIsLoading(true);

      // Request permission
      const result = await Notification.requestPermission();
      setPermission(result as PushPermissionState);

      if (result !== 'granted') {
        setIsLoading(false);
        return false;
      }

      // Get service worker registration
      const reg = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      subscriptionRef.current = subscription;

      // Extract keys
      const subJson = subscription.toJSON();
      const endpoint = subJson.endpoint!;
      const p256dh = subJson.keys!.p256dh!;
      const auth = subJson.keys!.auth!;

      // Save to Supabase (upsert by endpoint)
      const { error } = await (supabase
        .from('push_subscriptions' as any)
        .upsert(
          {
            user_id: user.id,
            couple_id: profile.couple_id,
            endpoint,
            keys_p256dh: p256dh,
            keys_auth: auth,
            user_agent: navigator.userAgent,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'endpoint' }
        ) as any);

      if (error) {
        console.error('[Push] Failed to save subscription:', error);
        return false;
      }

      setIsSubscribed(true);
      console.log('[Push] Subscription saved successfully');
      return true;
    } catch (err) {
      console.error('[Push] Subscribe error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user, profile?.couple_id]);

  // Unsubscribe
  const unsubscribe = useCallback(async () => {
    try {
      setIsLoading(true);
      if (subscriptionRef.current) {
        const endpoint = subscriptionRef.current.endpoint;
        await subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;

        // Remove from DB
        await (supabase
          .from('push_subscriptions' as any)
          .delete()
          .eq('endpoint', endpoint) as any);
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error('[Push] Unsubscribe error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-subscribe on login if permission was already granted
  useEffect(() => {
    if (!isLoading && permission === 'granted' && !isSubscribed && user && profile?.couple_id) {
      subscribe();
    }
  }, [isLoading, permission, isSubscribed, user, profile?.couple_id, subscribe]);

  return {
    permission,
    isSubscribed,
    isLoading,
    isIOS,
    isPWA,
    subscribe,
    unsubscribe,
  };
}
