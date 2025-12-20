import { useState, useEffect, useCallback } from 'react';
import { X, Share, MoreVertical, Plus, Download, ExternalLink, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'wouter';
import {
  getDeviceInfo,
  shouldShowInstallPrompt,
  setDismissed,
  hasNativePrompt,
  triggerNativeInstall,
  listenForAppInstalled,
  captureInstallPrompt,
  type DeviceType
} from '@/lib/pwa-utils';

interface InstallStep {
  icon: typeof Share;
  text: string;
}

const IOS_STEPS: InstallStep[] = [
  { icon: Share, text: 'Tap the Share button in Safari' },
  { icon: Plus, text: 'Scroll down and tap "Add to Home Screen"' },
  { icon: Smartphone, text: 'Tap "Add" to install' }
];

const ANDROID_STEPS: InstallStep[] = [
  { icon: MoreVertical, text: 'Tap the menu icon (3 dots)' },
  { icon: Download, text: 'Tap "Install app" or "Add to Home Screen"' },
  { icon: Smartphone, text: 'Tap "Install" to confirm' }
];

const DESKTOP_STEPS: InstallStep[] = [
  { icon: Download, text: 'Click the install icon in the address bar' },
  { icon: Smartphone, text: 'Or use Menu > Install Normie Nation' }
];

function getStepsForDevice(device: DeviceType): InstallStep[] {
  switch (device) {
    case 'ios':
      return IOS_STEPS;
    case 'android':
      return ANDROID_STEPS;
    default:
      return DESKTOP_STEPS;
  }
}

function getDeviceLabel(device: DeviceType): string {
  switch (device) {
    case 'ios':
      return 'iOS';
    case 'android':
      return 'Android';
    default:
      return 'Desktop';
  }
}

export function PWAInstallPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [deviceInfo] = useState(() => getDeviceInfo());

  useEffect(() => {
    captureInstallPrompt();
    
    const timer = setTimeout(() => {
      if (shouldShowInstallPrompt()) {
        setIsVisible(true);
      }
    }, 2000);

    const cleanup = listenForAppInstalled(() => {
      setIsVisible(false);
    });

    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed();
    setIsVisible(false);
  }, []);

  const handleInstall = useCallback(async () => {
    if (hasNativePrompt()) {
      setIsInstalling(true);
      const success = await triggerNativeInstall();
      setIsInstalling(false);
      if (success) {
        setIsVisible(false);
      }
    }
  }, []);

  if (!isVisible) return null;

  const steps = getStepsForDevice(deviceInfo.device);
  const showNativeButton = hasNativePrompt() && (deviceInfo.device === 'android' || deviceInfo.device === 'desktop');

  return (
    <div 
      className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300"
      role="dialog"
      aria-labelledby="pwa-install-title"
      data-testid="pwa-install-prompt"
    >
      <Card className="border-primary/30 bg-background/95 backdrop-blur-md shadow-xl">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              <h3 id="pwa-install-title" className="font-mono font-semibold text-sm uppercase tracking-wide">
                Install App
              </h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1 -mr-1"
              onClick={handleDismiss}
              aria-label="Close install prompt"
              data-testid="button-dismiss-install"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mb-3">
            Install Normie Nation on your {getDeviceLabel(deviceInfo.device)} for the best experience
          </p>

          {showNativeButton ? (
            <Button 
              onClick={handleInstall}
              disabled={isInstalling}
              className="w-full mb-3 font-mono uppercase"
              data-testid="button-native-install"
            >
              <Download className="w-4 h-4 mr-2" />
              {isInstalling ? 'Installing...' : 'Install Now'}
            </Button>
          ) : (
            <div className="space-y-2 mb-3">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">
                    {index + 1}
                  </span>
                  <step.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-foreground">{step.text}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-xs text-muted-foreground"
              data-testid="button-not-now"
            >
              Not now
            </Button>
            <Link href="/install">
              <Button
                variant="link"
                size="sm"
                className="text-xs text-primary gap-1"
                data-testid="link-full-guide"
              >
                Full guide
                <ExternalLink className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
