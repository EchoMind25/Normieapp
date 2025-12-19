import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, X } from "lucide-react";

const PROMPT_DISMISSED_KEY = "notification_prompt_dismissed";
const PROMPT_SHOWN_SESSION_KEY = "notification_prompt_shown_session";

export function NotificationPrompt() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const {
    isSupported,
    isEnabled,
    permission,
    isSubscribed,
    subscribe,
    isLoading,
  } = usePushNotifications();

  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setShowPrompt(false);
      return;
    }

    if (!isSupported || !isEnabled) {
      return;
    }

    if (isSubscribed) {
      return;
    }

    if (permission === "denied") {
      return;
    }

    const dismissed = localStorage.getItem(PROMPT_DISMISSED_KEY);
    if (dismissed) {
      return;
    }

    const shownThisSession = sessionStorage.getItem(PROMPT_SHOWN_SESSION_KEY);
    if (shownThisSession) {
      return;
    }

    const timer = setTimeout(() => {
      setShowPrompt(true);
      sessionStorage.setItem(PROMPT_SHOWN_SESSION_KEY, "true");
    }, 2000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, user, isSupported, isEnabled, isSubscribed, permission]);

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      toast({
        title: "Notifications enabled",
        description: "You'll now receive updates about polls and announcements.",
      });
      setShowPrompt(false);
    } else if (permission === "denied") {
      toast({
        title: "Permission denied",
        description: "Please enable notifications in your browser settings.",
        variant: "destructive",
      });
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  const handleDontAskAgain = () => {
    localStorage.setItem(PROMPT_DISMISSED_KEY, "true");
    setShowPrompt(false);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono">
            <Bell className="h-5 w-5 text-primary" />
            Enable Notifications
          </DialogTitle>
          <DialogDescription>
            Stay updated with the Normie Nation community. Get notified about:
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span>New community polls</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span>Poll results when they end</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span>Important announcements and streams</span>
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="w-full sm:w-auto"
            data-testid="button-dismiss-notifications"
          >
            <X className="h-4 w-4 mr-2" />
            Not Now
          </Button>
          <Button
            onClick={handleEnable}
            disabled={isLoading}
            className="w-full sm:w-auto"
            data-testid="button-enable-notifications"
          >
            <Bell className="h-4 w-4 mr-2" />
            {isLoading ? "Enabling..." : "Enable Notifications"}
          </Button>
        </DialogFooter>
        <div className="text-center">
          <button
            onClick={handleDontAskAgain}
            className="text-xs text-muted-foreground hover:underline"
            data-testid="button-dont-ask-again"
          >
            Don't ask me again
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NotificationPrompt;
