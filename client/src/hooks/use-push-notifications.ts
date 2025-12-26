import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface VapidKeyResponse {
  publicKey: string;
  enabled: boolean;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);

  const { data: vapidData } = useQuery<VapidKeyResponse>({
    queryKey: ["/api/push/vapid-key"],
    staleTime: Infinity,
  });

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  const checkSubscription = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      // Subscription check failed silently
    }
  }, []);

  const subscribeMutation = useMutation({
    mutationFn: async (subscription: PushSubscription) => {
      const json = subscription.toJSON();
      return apiRequest("POST", "/api/push/subscribe", {
        endpoint: json.endpoint,
        keys: json.keys,
      });
    },
    onSuccess: () => {
      setIsSubscribed(true);
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async (endpoint?: string) => {
      return apiRequest("POST", "/api/push/unsubscribe", { endpoint });
    },
    onSuccess: () => {
      setIsSubscribed(false);
    },
  });

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !vapidData?.publicKey || !vapidData?.enabled) {
      return false;
    }

    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey),
        });
      }

      await subscribeMutation.mutateAsync(subscription);
      return true;
    } catch (error) {
      return false;
    }
  }, [isSupported, vapidData, subscribeMutation]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        await unsubscribeMutation.mutateAsync(subscription.endpoint);
      } else {
        await unsubscribeMutation.mutateAsync(undefined);
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }, [unsubscribeMutation]);

  return {
    isSupported,
    isEnabled: vapidData?.enabled ?? false,
    permission,
    isSubscribed,
    subscribe,
    unsubscribe,
    isLoading: subscribeMutation.isPending || unsubscribeMutation.isPending,
  };
}
