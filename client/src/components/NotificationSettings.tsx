import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, BellOff, Loader2, Smartphone, AlertCircle } from "lucide-react";
import type { User } from "@shared/schema";

export function NotificationSettings() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const {
    isSupported,
    isEnabled,
    permission,
    isSubscribed,
    subscribe,
    unsubscribe,
    isLoading: pushLoading,
  } = usePushNotifications();

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<Pick<User, "notifyNewPolls" | "notifyPollResults" | "notifyAnnouncements">>) => {
      return apiRequest("PATCH", "/api/user/notification-settings", settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Settings saved", description: "Your notification preferences have been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update settings.", variant: "destructive" });
    },
  });

  const handlePushToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        toast({ title: "Notifications disabled", description: "You will no longer receive push notifications." });
      }
    } else {
      const success = await subscribe();
      if (success) {
        toast({ title: "Notifications enabled", description: "You will now receive push notifications for new polls." });
      } else if (permission === "denied") {
        toast({ 
          title: "Permission denied", 
          description: "Please enable notifications in your browser settings.",
          variant: "destructive" 
        });
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <p className="text-muted-foreground font-mono">Sign in to manage notification settings</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-mono">
          <Bell className="w-5 h-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Manage how you receive notifications from Normie Nation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-primary" />
              <div>
                <Label className="font-mono font-semibold">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive browser notifications on this device
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isSupported ? (
                <Badge variant="secondary" className="text-xs">Not Supported</Badge>
              ) : !isEnabled ? (
                <Badge variant="secondary" className="text-xs">Not Configured</Badge>
              ) : permission === "denied" ? (
                <Badge variant="destructive" className="text-xs">Blocked</Badge>
              ) : (
                <Button
                  variant={isSubscribed ? "default" : "outline"}
                  size="sm"
                  onClick={handlePushToggle}
                  disabled={pushLoading}
                  data-testid="button-toggle-push"
                >
                  {pushLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isSubscribed ? (
                    <>
                      <Bell className="w-4 h-4 mr-1" />
                      Enabled
                    </>
                  ) : (
                    <>
                      <BellOff className="w-4 h-4 mr-1" />
                      Enable
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {permission === "denied" && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>
                Push notifications are blocked. To enable them, click the lock icon in your browser address bar and allow notifications for this site.
              </p>
            </div>
          )}
        </div>

        <div className="border-t pt-4 space-y-4">
          <h4 className="font-mono font-semibold text-sm">Notification Types</h4>
          
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="notify-polls" className="font-mono">New Polls</Label>
              <p className="text-sm text-muted-foreground">Get notified when new polls are created</p>
            </div>
            <Switch
              id="notify-polls"
              checked={(user as any)?.notifyNewPolls ?? true}
              onCheckedChange={(checked) => updateSettingsMutation.mutate({ notifyNewPolls: checked })}
              disabled={updateSettingsMutation.isPending}
              data-testid="switch-notify-polls"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="notify-results" className="font-mono">Poll Results</Label>
              <p className="text-sm text-muted-foreground">Get notified when polls you voted on end</p>
            </div>
            <Switch
              id="notify-results"
              checked={(user as any)?.notifyPollResults ?? true}
              onCheckedChange={(checked) => updateSettingsMutation.mutate({ notifyPollResults: checked })}
              disabled={updateSettingsMutation.isPending}
              data-testid="switch-notify-results"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="notify-announcements" className="font-mono">Announcements</Label>
              <p className="text-sm text-muted-foreground">Get notified about important announcements</p>
            </div>
            <Switch
              id="notify-announcements"
              checked={(user as any)?.notifyAnnouncements ?? true}
              onCheckedChange={(checked) => updateSettingsMutation.mutate({ notifyAnnouncements: checked })}
              disabled={updateSettingsMutation.isPending}
              data-testid="switch-notify-announcements"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default NotificationSettings;
