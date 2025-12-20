import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/use-network';

export function OfflineBanner() {
  const { isOffline } = useNetworkStatus();
  const isEmbed = window.location.pathname.startsWith('/embed');

  if (isEmbed || !isOffline) return null;

  return (
    <>
      <div className="h-10" />
      <div 
        className="fixed top-0 left-0 right-0 z-[200] bg-amber-500 text-black py-2 px-4 text-center text-sm font-medium flex items-center justify-center gap-2"
        role="alert"
        data-testid="banner-offline"
      >
        <WifiOff className="w-4 h-4" />
        <span>You're offline. Some features may be unavailable.</span>
      </div>
    </>
  );
}
