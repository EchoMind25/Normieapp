import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { Network } from '@capacitor/network';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';

export const isNative = Capacitor.isNativePlatform();
export const isIOS = Capacitor.getPlatform() === 'ios';
export const isAndroid = Capacitor.getPlatform() === 'android';

export const haptics = {
  light: async () => {
    if (isNative) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (e) {
        // Haptics not available
      }
    }
  },
  medium: async () => {
    if (isNative) {
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch (e) {
        // Haptics not available
      }
    }
  },
  heavy: async () => {
    if (isNative) {
      try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } catch (e) {
        // Haptics not available
      }
    }
  },
  success: async () => {
    if (isNative) {
      try {
        await Haptics.notification({ type: NotificationType.Success });
      } catch (e) {
        // Haptics not available
      }
    }
  },
  warning: async () => {
    if (isNative) {
      try {
        await Haptics.notification({ type: NotificationType.Warning });
      } catch (e) {
        // Haptics not available
      }
    }
  },
  error: async () => {
    if (isNative) {
      try {
        await Haptics.notification({ type: NotificationType.Error });
      } catch (e) {
        // Haptics not available
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
      return false;
    }
  } else {
    if (navigator.share) {
      try {
        await navigator.share(options);
        return true;
      } catch (e) {
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
    // StatusBar not available
  }
}

export async function hideSplashScreen(): Promise<void> {
  if (!isNative) return;
  
  try {
    await SplashScreen.hide();
  } catch (e) {
    // SplashScreen not available
  }
}

const DISCLAIMER_KEY = 'normie_disclaimer_accepted';
// Update this version when Terms of Use or Privacy Policy is modified
// Format: YYYY-MM-DD to match the "Last updated" dates on Terms/Privacy pages
export const POLICY_VERSION = '2025-12-20';

export function hasAcceptedDisclaimer(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const accepted = localStorage.getItem(DISCLAIMER_KEY);
    return accepted === POLICY_VERSION;
  } catch {
    return true;
  }
}

export function hasPreviouslyAccepted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const accepted = localStorage.getItem(DISCLAIMER_KEY);
    // Returns true if they accepted any version before (but not current)
    return accepted !== null && accepted !== POLICY_VERSION;
  } catch {
    return false;
  }
}

export function getAcceptedVersion(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(DISCLAIMER_KEY);
  } catch {
    return null;
  }
}

export function acceptDisclaimer(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DISCLAIMER_KEY, POLICY_VERSION);
  } catch {
    // localStorage not available
  }
}

export interface CameraPhoto {
  dataUrl: string;
  format: string;
  webPath?: string;
}

export async function requestCameraPermissions(): Promise<boolean> {
  if (!isNative) return true;
  
  try {
    const permissions = await Camera.requestPermissions({
      permissions: ['camera', 'photos'],
    });
    return permissions.camera === 'granted' || permissions.photos === 'granted';
  } catch (e) {
    return false;
  }
}

export async function checkCameraPermissions(): Promise<{ camera: boolean; photos: boolean }> {
  if (!isNative) return { camera: true, photos: true };
  
  try {
    const permissions = await Camera.checkPermissions();
    return {
      camera: permissions.camera === 'granted',
      photos: permissions.photos === 'granted',
    };
  } catch (e) {
    return { camera: false, photos: false };
  }
}

export async function pickImageFromGallery(): Promise<CameraPhoto | null> {
  if (!isNative) return null;
  
  try {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) {
      throw new Error('Photo library permission denied');
    }
    
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
      promptLabelHeader: 'Select Image',
      promptLabelPhoto: 'Choose from Gallery',
    });
    
    return {
      dataUrl: photo.dataUrl || '',
      format: photo.format,
      webPath: photo.webPath,
    };
  } catch (e: any) {
    if (e?.message?.includes('cancelled') || e?.message?.includes('User cancelled')) {
      return null;
    }
    throw e;
  }
}

export async function takePhoto(): Promise<CameraPhoto | null> {
  if (!isNative) return null;
  
  try {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) {
      throw new Error('Camera permission denied');
    }
    
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
    });
    
    return {
      dataUrl: photo.dataUrl || '',
      format: photo.format,
      webPath: photo.webPath,
    };
  } catch (e: any) {
    if (e?.message?.includes('cancelled') || e?.message?.includes('User cancelled')) {
      return null;
    }
    throw e;
  }
}

export async function pickOrTakePhoto(): Promise<CameraPhoto | null> {
  if (!isNative) return null;
  
  try {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) {
      throw new Error('Camera/Photo library permission denied');
    }
    
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
      promptLabelHeader: 'Add Image',
      promptLabelPhoto: 'Choose from Gallery',
      promptLabelPicture: 'Take Photo',
    });
    
    return {
      dataUrl: photo.dataUrl || '',
      format: photo.format,
      webPath: photo.webPath,
    };
  } catch (e: any) {
    if (e?.message?.includes('cancelled') || e?.message?.includes('User cancelled')) {
      return null;
    }
    throw e;
  }
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}
