import { useState, useEffect } from "react";
import { Shield, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const CONSENT_KEY = "normie_data_consent";

export function ConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      setTimeout(() => setShowBanner(true), 3000);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div
      className="fixed bottom-16 sm:bottom-0 left-0 right-0 z-[100] p-4 bg-card border-t border-border shadow-lg"
      data-testid="consent-banner"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Shield className="h-6 w-6 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Your Privacy Matters</p>
            <p className="text-xs text-muted-foreground">
              We only collect publicly available blockchain data. We do not track personal information or use invasive analytics.
              By continuing, you agree to our{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <Link
            href="/privacy"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            Learn More <ExternalLink className="h-3 w-3" />
          </Link>
          <Button onClick={handleAccept} size="sm" className="gap-1 ml-auto sm:ml-0" data-testid="button-consent-accept">
            <Check className="h-4 w-4" />
            I Understand
          </Button>
        </div>
      </div>
    </div>
  );
}
