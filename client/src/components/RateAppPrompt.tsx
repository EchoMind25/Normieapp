import { useState, useEffect } from "react";
import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isNative } from "@/lib/native-utils";

const USAGE_KEY = "normie_app_usage_count";
const RATE_DISMISSED_KEY = "normie_rate_dismissed";
const RATE_THRESHOLD = 5;

export function RateAppPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Only show rate prompt for native app store downloads, not web/dev preview
    if (!isNative) return;

    const dismissed = localStorage.getItem(RATE_DISMISSED_KEY);
    if (dismissed === "true") return;

    const count = parseInt(localStorage.getItem(USAGE_KEY) || "0", 10);
    const newCount = count + 1;
    localStorage.setItem(USAGE_KEY, newCount.toString());

    if (newCount >= RATE_THRESHOLD) {
      setTimeout(() => setShowPrompt(true), 2000);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(RATE_DISMISSED_KEY, "true");
    setShowPrompt(false);
  };

  const handleRate = () => {
    localStorage.setItem(RATE_DISMISSED_KEY, "true");
    setShowPrompt(false);
    
    if (isNative) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        window.open("https://apps.apple.com/app/normie-observer/id000000000", "_blank");
      } else {
        window.open("https://play.google.com/store/apps/details?id=com.normie.observer", "_blank");
      }
    } else {
      window.open("https://x.com/NormieCEO", "_blank");
    }
  };

  const handleLater = () => {
    localStorage.setItem(USAGE_KEY, "0");
    setShowPrompt(false);
  };

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              Enjoying Normie Observer?
            </DialogTitle>
          </div>
          <DialogDescription>
            Your feedback helps other Normies discover the app. Would you like to leave a review?
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button onClick={handleRate} className="w-full gap-2" data-testid="button-rate-app">
            <Star className="h-4 w-4" />
            Rate the App
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleLater} className="flex-1" data-testid="button-rate-later">
              Maybe Later
            </Button>
            <Button variant="ghost" onClick={handleDismiss} className="flex-1" data-testid="button-rate-dismiss">
              <X className="h-4 w-4 mr-1" />
              Don't Ask Again
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
