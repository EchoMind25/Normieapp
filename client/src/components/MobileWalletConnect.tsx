import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { 
  WalletProvider, 
  getAvailableWallets, 
  hasWalletInstalled, 
  isMobileDevice,
  getWalletDownloadLink,
  openInWalletBrowser
} from "@/lib/wallet";
import { isNative } from "@/lib/native-utils";
import { Wallet, ExternalLink, Download, Smartphone, Globe } from "lucide-react";
import { SiSolana } from "react-icons/si";

interface MobileWalletConnectProps {
  provider: WalletProvider;
  onConnect?: () => void;
  onClose?: () => void;
  trigger?: React.ReactNode;
}

export function MobileWalletConnect({ provider, onConnect, onClose, trigger }: MobileWalletConnectProps) {
  const [open, setOpen] = useState(false);
  const isMobile = isMobileDevice() || isNative;
  const walletInstalled = hasWalletInstalled(provider);
  
  const providerName = provider === 'phantom' ? 'Phantom' : 'Solflare';
  const downloadUrl = getWalletDownloadLink(provider);
  
  const handleOpenInWallet = () => {
    openInWalletBrowser(provider);
    setOpen(false);
    onClose?.();
  };
  
  const handleDownload = () => {
    window.open(downloadUrl, '_blank');
  };
  
  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  if (walletInstalled) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2" data-testid="button-mobile-wallet-connect">
            <Wallet className="w-4 h-4" />
            Connect {providerName}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-mobile-wallet">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SiSolana className="w-5 h-5 text-primary" />
            Connect to {providerName}
          </DialogTitle>
          <DialogDescription>
            {isMobile 
              ? `Open Normie Observer in the ${providerName} app to connect your wallet.`
              : `Install the ${providerName} browser extension to connect your wallet.`
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 pt-4">
          {isMobile ? (
            <>
              <Button 
                onClick={handleOpenInWallet}
                className="w-full gap-2"
                data-testid="button-open-in-wallet"
              >
                <Smartphone className="w-4 h-4" />
                Open in {providerName} App
              </Button>
              
              <div className="text-center">
                <span className="text-xs text-muted-foreground">or</span>
              </div>
              
              <Button 
                variant="outline"
                onClick={handleDownload}
                className="w-full gap-2"
                data-testid="button-download-wallet"
              >
                <Download className="w-4 h-4" />
                Download {providerName}
              </Button>
              
              <p className="text-xs text-muted-foreground text-center pt-2">
                Already have {providerName}? Tap "Open in {providerName} App" to connect your wallet securely.
              </p>
            </>
          ) : (
            <>
              <Button 
                onClick={handleDownload}
                className="w-full gap-2"
                data-testid="button-install-extension"
              >
                <ExternalLink className="w-4 h-4" />
                Install {providerName} Extension
              </Button>
              
              <p className="text-xs text-muted-foreground text-center pt-2">
                After installing, refresh this page and click "Connect Wallet" again.
              </p>
            </>
          )}
        </div>
        
        <div className="flex justify-center pt-4 border-t mt-4">
          <Button variant="ghost" size="sm" onClick={handleClose} data-testid="button-close-wallet-dialog">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface WalletConnectionOptionsProps {
  onSelectProvider: (provider: WalletProvider) => void;
  onClose?: () => void;
}

export function WalletConnectionOptions({ onSelectProvider, onClose }: WalletConnectionOptionsProps) {
  const availableWallets = getAvailableWallets();
  const isMobile = isMobileDevice() || isNative;
  
  const phantomInstalled = hasWalletInstalled('phantom');
  const solflareInstalled = hasWalletInstalled('solflare');
  
  return (
    <div className="space-y-3">
      {phantomInstalled ? (
        <Button 
          onClick={() => onSelectProvider('phantom')}
          variant="outline"
          className="w-full justify-start gap-3"
          data-testid="button-connect-phantom"
        >
          <div className="w-8 h-8 rounded-full bg-[#AB9FF2] flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <div className="text-left">
            <div className="font-medium">Phantom</div>
            <div className="text-xs text-muted-foreground">Connected</div>
          </div>
        </Button>
      ) : (
        <MobileWalletConnect 
          provider="phantom" 
          onClose={onClose}
          trigger={
            <Button 
              variant="outline"
              className="w-full justify-start gap-3"
              data-testid="button-phantom-not-installed"
            >
              <div className="w-8 h-8 rounded-full bg-[#AB9FF2] flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <div className="text-left flex-1">
                <div className="font-medium">Phantom</div>
                <div className="text-xs text-muted-foreground">
                  {isMobile ? 'Tap to open in app' : 'Install extension'}
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </Button>
          }
        />
      )}
      
      {solflareInstalled ? (
        <Button 
          onClick={() => onSelectProvider('solflare')}
          variant="outline"
          className="w-full justify-start gap-3"
          data-testid="button-connect-solflare"
        >
          <div className="w-8 h-8 rounded-full bg-[#FC6C21] flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <div className="text-left">
            <div className="font-medium">Solflare</div>
            <div className="text-xs text-muted-foreground">Connected</div>
          </div>
        </Button>
      ) : (
        <MobileWalletConnect 
          provider="solflare" 
          onClose={onClose}
          trigger={
            <Button 
              variant="outline"
              className="w-full justify-start gap-3"
              data-testid="button-solflare-not-installed"
            >
              <div className="w-8 h-8 rounded-full bg-[#FC6C21] flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <div className="text-left flex-1">
                <div className="font-medium">Solflare</div>
                <div className="text-xs text-muted-foreground">
                  {isMobile ? 'Tap to open in app' : 'Install extension'}
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </Button>
          }
        />
      )}
      
      {!phantomInstalled && !solflareInstalled && isMobile && (
        <p className="text-xs text-muted-foreground text-center pt-4">
          To connect your Solana wallet on mobile, you need to open Normie Observer inside your wallet app's browser.
        </p>
      )}
    </div>
  );
}
