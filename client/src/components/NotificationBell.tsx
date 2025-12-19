import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";

export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const {
    isSupported,
    isEnabled,
    permission,
    isSubscribed,
    subscribe,
    unsubscribe,
    isLoading,
  } = usePushNotifications();

  if (!isAuthenticated) {
    return null;
  }

  if (!isSupported || !isEnabled) {
    return null;
  }

  const handleClick = async () => {
    if (permission === "denied") {
      toast({
        title: "Notifications blocked",
        description: "Please enable notifications in your browser settings, then try again.",
        variant: "destructive",
      });
      return;
    }
    
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        toast({
          title: "Notifications disabled",
          description: "You will no longer receive push notifications.",
        });
      }
    } else {
      const success = await subscribe();
      if (success) {
        toast({
          title: "Notifications enabled",
          description: "You'll now receive updates about polls and announcements.",
        });
      } else {
        toast({
          title: "Could not enable notifications",
          description: "Please check your browser settings and try again.",
          variant: "destructive",
        });
      }
    }
  };

  const getTooltipContent = () => {
    if (permission === "denied") {
      return "Notifications blocked - enable in browser settings";
    }
    if (isSubscribed) {
      return "Notifications enabled - click to disable";
    }
    return "Enable notifications";
  };

  const getIcon = () => {
    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (permission === "denied") {
      return <BellOff className="h-4 w-4 text-muted-foreground" />;
    }
    if (isSubscribed) {
      return <BellRing className="h-4 w-4 text-primary" />;
    }
    return <Bell className="h-4 w-4" />;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClick}
          disabled={isLoading}
          data-testid="button-notification-bell"
        >
          {getIcon()}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{getTooltipContent()}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default NotificationBell;
