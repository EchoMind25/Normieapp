import { useState, useEffect } from 'react';
import { initNetworkListener, getNetworkStatus } from '@/lib/native-utils';

export function useNetworkStatus() {
  const [isOffline, setIsOffline] = useState(false);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    getNetworkStatus().then((status) => {
      setIsOffline(!status.connected);
      setConnectionType(status.connectionType);
    });

    const cleanup = initNetworkListener((offline) => {
      setIsOffline(offline);
      if (!offline) {
        getNetworkStatus().then(s => setConnectionType(s.connectionType));
      }
    });

    return () => {
      cleanup.then(unsub => unsub?.());
    };
  }, []);

  return { isOffline, connectionType };
}
