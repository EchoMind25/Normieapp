import { useState, useEffect, useCallback } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Share, MoreVertical, Download, Smartphone, Check, ExternalLink, Monitor, Apple } from 'lucide-react';
import { SiAndroid } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  getDeviceInfo,
  isStandalone,
  hasNativePrompt,
  triggerNativeInstall,
  captureInstallPrompt,
  type DeviceType
} from '@/lib/pwa-utils';

import iosHomepage from '@assets/image_1766229343927.png';
import iosShareMenu from '@assets/image_1766229336344.png';
import iosHomeScreen from '@assets/image_1766229330948.png';

interface InstallStep {
  icon: typeof Share;
  title: string;
  description: string;
  screenshotPlaceholder?: string;
  screenshotImage?: string;
}

const IOS_STEPS: InstallStep[] = [
  {
    icon: Share,
    title: 'Open in Safari',
    description: 'Make sure you\'re viewing normie.observer in Safari. The install option is only available in Safari on iOS.',
    screenshotImage: iosHomepage
  },
  {
    icon: Share,
    title: 'Tap the Share Button',
    description: 'Tap the Share button at the bottom of your Safari browser and select "Add to Home Screen".',
    screenshotImage: iosShareMenu
  },
  {
    icon: Check,
    title: 'Find it on Your Home Screen',
    description: 'The Normie Nation app will now appear on your home screen ready to use!',
    screenshotImage: iosHomeScreen
  }
];

const ANDROID_STEPS: InstallStep[] = [
  {
    icon: MoreVertical,
    title: 'Open the Menu',
    description: 'Tap the three-dot menu icon in the top right corner of Chrome.'
  },
  {
    icon: Download,
    title: 'Install App',
    description: 'Look for "Install app" or "Add to Home Screen" in the menu and tap it.'
  },
  {
    icon: Check,
    title: 'Confirm Installation',
    description: 'Tap "Install" in the popup to add the app to your home screen.'
  }
];

const DESKTOP_STEPS: InstallStep[] = [
  {
    icon: Download,
    title: 'Look for the Install Icon',
    description: 'In Chrome or Edge, look for an install icon in the address bar (usually on the right side).',
    screenshotPlaceholder: '/install-screenshots/desktop-icon.png'
  },
  {
    icon: Monitor,
    title: 'Click Install',
    description: 'Click the install icon, then click "Install" in the popup dialog.',
    screenshotPlaceholder: '/install-screenshots/desktop-install.png'
  },
  {
    icon: Check,
    title: 'Launch the App',
    description: 'The app will open in its own window and be available from your desktop or start menu.',
    screenshotPlaceholder: '/install-screenshots/desktop-done.png'
  }
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

function getTabValueForDevice(device: DeviceType): string {
  switch (device) {
    case 'ios':
      return 'ios';
    case 'android':
      return 'android';
    default:
      return 'desktop';
  }
}

function StepCard({ step, stepNumber }: { step: InstallStep; stepNumber: number }) {
  return (
    <div className="flex gap-4 p-4 rounded-lg bg-muted/30">
      <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 text-primary font-mono font-bold">
        {stepNumber}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <step.icon className="w-5 h-5 text-primary" />
          <h3 className="font-mono font-semibold uppercase tracking-wide">{step.title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{step.description}</p>
        {step.screenshotImage && (
          <div className="mt-3 flex justify-center">
            <img 
              src={step.screenshotImage} 
              alt={step.title}
              className="max-w-[200px] rounded-md border border-border/50 shadow-lg"
            />
          </div>
        )}
        {step.screenshotPlaceholder && !step.screenshotImage && (
          <div className="mt-3 aspect-video rounded-md bg-muted/50 border border-border/50 flex items-center justify-center">
            <span className="text-xs text-muted-foreground font-mono">
              Screenshot: {step.screenshotPlaceholder}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Install() {
  const [deviceInfo] = useState(() => getDeviceInfo());
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [activeTab, setActiveTab] = useState(() => getTabValueForDevice(deviceInfo.device));
  
  const isPreviewMode = typeof window !== 'undefined' && 
    new URLSearchParams(window.location.search).get('preview') === 'true';

  useEffect(() => {
    captureInstallPrompt();
    if (!isPreviewMode) {
      setIsInstalled(isStandalone());
    }
  }, [isPreviewMode]);

  const handleNativeInstall = useCallback(async () => {
    setIsInstalling(true);
    const success = await triggerNativeInstall();
    setIsInstalling(false);
    if (success) {
      setIsInstalled(true);
    }
  }, []);

  if (isInstalled && !isPreviewMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-mono font-bold uppercase">Already Installed</h1>
            <p className="text-muted-foreground">
              Normie Nation is already installed on your device. You can access it from your home screen or app launcher.
            </p>
            <Link href="/">
              <Button className="w-full font-mono uppercase" data-testid="button-go-home">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to App
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-mono font-bold uppercase tracking-wide">Install Normie Nation</h1>
            <p className="text-xs text-muted-foreground">Get the full app experience</p>
          </div>
          {deviceInfo.device !== 'ios' && hasNativePrompt() && (
            <Button
              onClick={handleNativeInstall}
              disabled={isInstalling}
              className="font-mono uppercase"
              data-testid="button-quick-install"
            >
              <Download className="w-4 h-4 mr-2" />
              {isInstalling ? 'Installing...' : 'Install'}
            </Button>
          )}
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 font-mono uppercase">
              <Smartphone className="w-6 h-6 text-primary" />
              Why Install?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 sm:grid-cols-2">
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Instant access from your home screen</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Full-screen experience without browser UI</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Push notifications for price alerts</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                <span>Works offline with cached data</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="font-mono uppercase">Installation Guide</CardTitle>
            {deviceInfo.device === activeTab && (
              <Badge variant="secondary" className="font-mono text-xs">
                Your device
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="ios" className="gap-2 font-mono" data-testid="tab-ios">
                  <Apple className="w-4 h-4" />
                  <span className="hidden sm:inline">iOS</span>
                </TabsTrigger>
                <TabsTrigger value="android" className="gap-2 font-mono" data-testid="tab-android">
                  <SiAndroid className="w-4 h-4" />
                  <span className="hidden sm:inline">Android</span>
                </TabsTrigger>
                <TabsTrigger value="desktop" className="gap-2 font-mono" data-testid="tab-desktop">
                  <Monitor className="w-4 h-4" />
                  <span className="hidden sm:inline">Desktop</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ios" className="mt-6 space-y-4">
                <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm text-amber-200">
                    Note: On iOS, you must use Safari to install web apps. Other browsers like Chrome don't support this feature.
                  </p>
                </div>
                {IOS_STEPS.map((step, index) => (
                  <StepCard key={index} step={step} stepNumber={index + 1} />
                ))}
              </TabsContent>

              <TabsContent value="android" className="mt-6 space-y-4">
                {hasNativePrompt() && deviceInfo.device === 'android' && (
                  <div className="p-4 rounded-md bg-primary/10 border border-primary/20 text-center space-y-3">
                    <p className="text-sm">Quick install available!</p>
                    <Button
                      onClick={handleNativeInstall}
                      disabled={isInstalling}
                      className="font-mono uppercase"
                      data-testid="button-android-install"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {isInstalling ? 'Installing...' : 'Install Now'}
                    </Button>
                  </div>
                )}
                {ANDROID_STEPS.map((step, index) => (
                  <StepCard key={index} step={step} stepNumber={index + 1} />
                ))}
              </TabsContent>

              <TabsContent value="desktop" className="mt-6 space-y-4">
                {hasNativePrompt() && deviceInfo.device === 'desktop' && (
                  <div className="p-4 rounded-md bg-primary/10 border border-primary/20 text-center space-y-3">
                    <p className="text-sm">Quick install available!</p>
                    <Button
                      onClick={handleNativeInstall}
                      disabled={isInstalling}
                      className="font-mono uppercase"
                      data-testid="button-desktop-install"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {isInstalling ? 'Installing...' : 'Install Now'}
                    </Button>
                  </div>
                )}
                <div className="p-3 rounded-md bg-muted/50 border border-border/50">
                  <p className="text-sm text-muted-foreground">
                    Works with Chrome, Edge, and other Chromium-based browsers. Firefox and Safari on desktop have limited PWA support.
                  </p>
                </div>
                {DESKTOP_STEPS.map((step, index) => (
                  <StepCard key={index} step={step} stepNumber={index + 1} />
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-mono uppercase">Troubleshooting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Don't see the install option?</h3>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Make sure you're using a supported browser (Safari on iOS, Chrome on Android/Desktop)</li>
                <li>Try refreshing the page</li>
                <li>If you've dismissed the install prompt, you may need to wait or check browser settings</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Already installed but not working?</h3>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Try removing the app from your home screen and reinstalling</li>
                <li>Clear your browser cache and try again</li>
                <li>Make sure you have a stable internet connection</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="text-center py-8">
          <a
            href="https://normie.observer"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            data-testid="link-normie-observer"
          >
            normie.observer
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </main>
    </div>
  );
}
