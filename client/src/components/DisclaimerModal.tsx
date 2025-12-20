import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, Scale } from 'lucide-react';
import { hasAcceptedDisclaimer, acceptDisclaimer } from '@/lib/native-utils';

export function DisclaimerModal() {
  const [isOpen, setIsOpen] = useState(false);

  // Hide on embed pages
  const isEmbed = useMemo(() => window.location.pathname.startsWith('/embed'), []);

  useEffect(() => {
    if (!isEmbed && !hasAcceptedDisclaimer()) {
      setIsOpen(true);
    }
  }, [isEmbed]);

  const handleAccept = () => {
    acceptDisclaimer();
    setIsOpen(false);
  };

  if (isEmbed) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-md border-primary/30"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono uppercase">
            <Shield className="w-5 h-5 text-primary" />
            Important Notice
          </DialogTitle>
          <DialogDescription className="text-left space-y-4 pt-4">
            <div className="flex items-start gap-3 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-foreground text-sm">Risk Warning</p>
                <p className="text-xs text-muted-foreground">
                  Cryptocurrency investments carry significant risk. Prices are highly volatile and you may lose some or all of your investment.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <p>
                <strong>Educational Purposes Only:</strong> This app provides informational price tracking for Solana-based tokens and NFTs. Nothing in this app constitutes financial advice.
              </p>
              
              <p>
                <strong>No Purchase Facilitation:</strong> This app does not facilitate the purchase or sale of cryptocurrency or NFTs. All transactions occur through external wallets and platforms.
              </p>

              <p>
                <strong>Age Requirement:</strong> You must be 18 years or older to use this application due to financial information content.
              </p>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50">
              <Scale className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                By continuing, you acknowledge that you have read and agree to our{' '}
                <a href="/terms" className="text-primary underline">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" className="text-primary underline">Privacy Policy</a>.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <Button 
          onClick={handleAccept} 
          className="w-full font-mono uppercase mt-4"
          data-testid="button-accept-disclaimer"
        >
          I Understand and Accept
        </Button>
      </DialogContent>
    </Dialog>
  );
}
