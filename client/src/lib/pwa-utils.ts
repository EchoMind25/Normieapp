export type DeviceType = 'ios' | 'android' | 'desktop';
export type BrowserType = 'safari' | 'chrome' | 'edge' | 'firefox' | 'other';

export interface DeviceInfo {
  device: DeviceType;
  browser: BrowserType;
  isStandalone: boolean;
  canInstall: boolean;
}

const STORAGE_KEYS = {
  DISMISSED_AT: 'pwa_install_dismissed_at',
  SHOWN_COUNT: 'pwa_install_shown_count',
  INSTALLED: 'pwa_installed'
} as const;

const DISMISSAL_COOLDOWN_DAYS = 7;

export function detectDevice(): DeviceType {
  const ua = navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'ios';
  }
  
  if (/android/.test(ua)) {
    return 'android';
  }
  
  return 'desktop';
}

export function detectBrowser(): BrowserType {
  const ua = navigator.userAgent.toLowerCase();
  
  if (/edg/.test(ua)) {
    return 'edge';
  }
  
  if (/chrome/.test(ua) && !/edg/.test(ua)) {
    return 'chrome';
  }
  
  if (/safari/.test(ua) && !/chrome/.test(ua)) {
    return 'safari';
  }
  
  if (/firefox/.test(ua)) {
    return 'firefox';
  }
  
  return 'other';
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  
  const isStandaloneMode = 
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://');
  
  return isStandaloneMode;
}

export function isPWAInstallable(): boolean {
  const device = detectDevice();
  const browser = detectBrowser();
  
  if (device === 'ios') {
    return browser === 'safari';
  }
  
  if (device === 'android') {
    return browser === 'chrome';
  }
  
  return browser === 'chrome' || browser === 'edge';
}

export function getDeviceInfo(): DeviceInfo {
  return {
    device: detectDevice(),
    browser: detectBrowser(),
    isStandalone: isStandalone(),
    canInstall: isPWAInstallable()
  };
}

export function getDismissedAt(): number | null {
  const value = localStorage.getItem(STORAGE_KEYS.DISMISSED_AT);
  return value ? parseInt(value, 10) : null;
}

export function setDismissed(): void {
  localStorage.setItem(STORAGE_KEYS.DISMISSED_AT, Date.now().toString());
  incrementShownCount();
}

export function isDismissalExpired(): boolean {
  const dismissedAt = getDismissedAt();
  if (!dismissedAt) return true;
  
  const cooldownMs = DISMISSAL_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - dismissedAt > cooldownMs;
}

export function getShownCount(): number {
  const value = localStorage.getItem(STORAGE_KEYS.SHOWN_COUNT);
  return value ? parseInt(value, 10) : 0;
}

export function incrementShownCount(): void {
  const count = getShownCount();
  localStorage.setItem(STORAGE_KEYS.SHOWN_COUNT, (count + 1).toString());
}

export function markAsInstalled(): void {
  localStorage.setItem(STORAGE_KEYS.INSTALLED, 'true');
}

export function isMarkedAsInstalled(): boolean {
  return localStorage.getItem(STORAGE_KEYS.INSTALLED) === 'true';
}

export function shouldShowInstallPrompt(): boolean {
  if (isStandalone()) return false;
  if (isMarkedAsInstalled()) return false;
  if (!isPWAInstallable()) return false;
  if (!isDismissalExpired()) return false;
  
  return true;
}

export function clearInstallData(): void {
  localStorage.removeItem(STORAGE_KEYS.DISMISSED_AT);
  localStorage.removeItem(STORAGE_KEYS.SHOWN_COUNT);
  localStorage.removeItem(STORAGE_KEYS.INSTALLED);
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function captureInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });
}

export function hasNativePrompt(): boolean {
  return deferredPrompt !== null;
}

export async function triggerNativeInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  
  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      markAsInstalled();
      deferredPrompt = null;
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

export function listenForAppInstalled(callback: () => void): () => void {
  const handler = () => {
    markAsInstalled();
    callback();
  };
  
  window.addEventListener('appinstalled', handler);
  
  return () => {
    window.removeEventListener('appinstalled', handler);
  };
}
