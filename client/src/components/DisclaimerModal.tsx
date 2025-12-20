import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, Scale, RefreshCw } from 'lucide-react';
import { hasAcceptedDisclaimer, acceptDisclaimer, hasPreviouslyAccepted, POLICY_VERSION } from '@/lib/native-utils';

export function DisclaimerModal() {
  const [needsAcceptance, setNeedsAcceptance] = useState(false);
  const [isPolicyUpdate, setIsPolicyUpdate] = useState(false);
  const [location] = useLocation();

  // Pages where the modal should be hidden (embeds, terms, privacy)
  const isExemptPage = location.startsWith('/embed') || 
                       location === '/terms' || 
                       location === '/privacy';

  useEffect(() => {
    if (!hasAcceptedDisclaimer()) {
      setNeedsAcceptance(true);
      setIsPolicyUpdate(hasPreviouslyAccepted());
    }
  }, []);

  // Modal is open when acceptance is needed AND not on an exempt page
  const isOpen = needsAcceptance && !isExemptPage;

  const handleAccept = () => {
    acceptDisclaimer();
    setNeedsAcceptance(false);
  };

  if (isExemptPage && !needsAcceptance) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-md border-primary/30"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono uppercase">
            {isPolicyUpdate ? (
              <>
                <RefreshCw className="w-5 h-5 text-primary" />
                Policy Update
              </>
            ) : (
              <>
                <Shield className="w-5 h-5 text-primary" />
                Important Notice
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-left space-y-4 pt-4">
            {isPolicyUpdate && (
              <div className="flex items-start gap-3 p-3 rounded-md bg-primary/10 border border-primary/20">
                <RefreshCw className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-foreground text-sm">Updated Terms & Privacy Policy</p>
                  <p className="text-xs text-muted-foreground">
                    Our Terms of Service and Privacy Policy have been updated (Version: {POLICY_VERSION}). Please review the changes and accept to continue using the app.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-foreground text-sm">Risk Warning</p>
                <p className="text-xs text-muted-foreground">
                  Cryptocurrency investments carry significant risk. Prices are highly volatile and you may lose some or all of your investment.
                </p>
              </div>
            </div>

            {!isPolicyUpdate && (
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
            )}

            <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50">
              <Scale className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                By continuing, you acknowledge that you have read and agree to our{' '}
                <Link href="/terms" className="text-primary underline" data-testid="link-terms">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-primary underline" data-testid="link-privacy">Privacy Policy</Link>.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <Button 
          onClick={handleAccept} 
          className="w-full font-mono uppercase mt-4"
          data-testid="button-accept-disclaimer"
        >
          {isPolicyUpdate ? 'I Accept the Updated Terms' : 'I Understand and Accept'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
