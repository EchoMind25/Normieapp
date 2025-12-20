import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { Network } from '@capacitor/network';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export const isNative = Capacitor.isNativePlatform();
export const isIOS = Capacitor.getPlatform() === 'ios';
export const isAndroid = Capacitor.getPlatform() === 'android';

export const haptics = {
  light: async () => {
    if (isNative) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (e) {
        console.debug('Haptics not available');
      }
    }
  },
  medium: async () => {
    if (isNative) {
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch (e) {
        console.debug('Haptics not available');
      }
    }
  },
  heavy: async () => {
    if (isNative) {
      try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } catch (e) {
        console.debug('Haptics not available');
      }
    }
  },
  success: async () => {
    if (isNative) {
      try {
        await Haptics.notification({ type: NotificationType.Success });
      } catch (e) {
        console.debug('Haptics not available');
      }
    }
  },
  warning: async () => {
    if (isNative) {
      try {
        await Haptics.notification({ type: NotificationType.Warning });
      } catch (e) {
        console.debug('Haptics not available');
      }
    }
  },
  error: async () => {
    if (isNative) {
      try {
        await Haptics.notification({ type: NotificationType.Error });
      } catch (e) {
        console.debug('Haptics not available');
      }
    }
  },
};

export async function shareContent(options: {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}): Promise<boolean> {
  if (isNative) {
    try {
      await Share.share(options);
      return true;
    } catch (e) {
      console.debug('Share cancelled or unavailable');
      return false;
    }
  } else {
    if (navigator.share) {
      try {
        await navigator.share(options);
        return true;
      } catch (e) {
        console.debug('Web share cancelled');
        return false;
      }
    }
    return false;
  }
}

export async function shareNFT(nftId: string, nftName: string): Promise<boolean> {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://normie.observer';
  return shareContent({
    title: `Check out ${nftName} on Normie Observer`,
    url: `${baseUrl}/marketplace/nft/${nftId}`,
    dialogTitle: 'Share NFT',
  });
}

export async function shareMeme(memeUrl: string): Promise<boolean> {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://normie.observer';
  const fullUrl = memeUrl.startsWith('http') ? memeUrl : `${baseUrl}${memeUrl}`;
  return shareContent({
    title: 'Check out this meme from Normie Nation',
    url: fullUrl,
    dialogTitle: 'Share Meme',
  });
}

export async function sharePrice(): Promise<boolean> {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://normie.observer';
  return shareContent({
    title: '$NORMIE Price Tracker',
    text: 'Track $NORMIE price in real-time on Normie Observer',
    url: baseUrl,
    dialogTitle: 'Share Normie Observer',
  });
}

let networkListenerInitialized = false;
let offlineCallbacks: Set<(isOffline: boolean) => void> = new Set();

export function addNetworkCallback(callback: (isOffline: boolean) => void): () => void {
  offlineCallbacks.add(callback);
  return () => {
    offlineCallbacks.delete(callback);
  };
}

function notifyCallbacks(isOffline: boolean): void {
  offlineCallbacks.forEach(cb => cb(isOffline));
}

export async function initNetworkListener(onStatusChange: (isOffline: boolean) => void): Promise<() => void> {
  const removeCallback = addNetworkCallback(onStatusChange);
  
  if (!networkListenerInitialized) {
    networkListenerInitialized = true;
    
    try {
      const status = await Network.getStatus();
      notifyCallbacks(!status.connected);
      
      Network.addListener('networkStatusChange', (status) => {
        notifyCallbacks(!status.connected);
      });
    } catch (e) {
      console.debug('Network listener not available');
      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => notifyCallbacks(false));
        window.addEventListener('offline', () => notifyCallbacks(true));
        notifyCallbacks(!navigator.onLine);
      }
    }
  } else {
    getNetworkStatus().then(status => onStatusChange(!status.connected));
  }
  
  return removeCallback;
}

export async function getNetworkStatus(): Promise<{ connected: boolean; connectionType: string }> {
  try {
    const status = await Network.getStatus();
    return {
      connected: status.connected,
      connectionType: status.connectionType,
    };
  } catch (e) {
    return {
      connected: navigator.onLine,
      connectionType: 'unknown',
    };
  }
}

export async function initStatusBar(): Promise<void> {
  if (!isNative) return;
  
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    if (isAndroid) {
      await StatusBar.setBackgroundColor({ color: '#0a0a0a' });
    }
  } catch (e) {
    console.debug('StatusBar not available');
  }
}

export async function hideSplashScreen(): Promise<void> {
  if (!isNative) return;
  
  try {
    await SplashScreen.hide();
  } catch (e) {
    console.debug('SplashScreen not available');
  }
}

const DISCLAIMER_KEY = 'normie_disclaimer_accepted';
const DISCLAIMER_VERSION = '1.0';

export function hasAcceptedDisclaimer(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const accepted = localStorage.getItem(DISCLAIMER_KEY);
    return accepted === DISCLAIMER_VERSION;
  } catch {
    return true;
  }
}

export function acceptDisclaimer(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DISCLAIMER_KEY, DISCLAIMER_VERSION);
  } catch {
    console.debug('localStorage not available');
  }
}
