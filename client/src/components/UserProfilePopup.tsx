import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { normalizeStorageUrl } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Wallet,
  Crown,
  Shield,
  Star,
  Clock,
  Coins,
  Copy,
  Check,
  Ban,
  UserX,
  ExternalLink,
  Calendar,
} from "lucide-react";

interface UserProfile {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  walletAddress: string | null;
  holdingsVisible: boolean;
  balance?: number | null;
  holdDuration?: number | null;
  createdAt: string;
  isBanned?: boolean;
}

interface UserProfilePopupProps {
  userId?: string;
  username?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfilePopup({ userId, username, isOpen, onClose }: UserProfilePopupProps) {
  const { user: currentUser, isAdmin: isViewerAdmin } = useAuth();
  const { toast } = useToast();
  const [copiedWallet, setCopiedWallet] = useState(false);

  const isViewerFounder = currentUser?.role === "founder";

  const { data: profile, isLoading, isError } = useQuery<UserProfile>({
    queryKey: ["/api/users/profile", userId || username],
    enabled: isOpen && !!(userId || username),
  });

  const banMutation = useMutation({
    mutationFn: async (ban: boolean) => {
      const res = await apiRequest("POST", `/api/admin/users/${profile?.id}/ban`, { ban });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update user");
      }
      return res.json();
    },
    onSuccess: (_, ban) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/profile", userId || username] });
      toast({
        title: ban ? "User banned" : "User unbanned",
        description: `${profile?.username} has been ${ban ? "banned" : "unbanned"}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Action failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyWallet = () => {
    if (profile?.walletAddress) {
      navigator.clipboard.writeText(profile.walletAddress);
      setCopiedWallet(true);
      toast({ title: "Copied!", description: "Wallet address copied to clipboard" });
      setTimeout(() => setCopiedWallet(false), 2000);
    }
  };

  const formatDuration = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return `${Math.floor(seconds / 60)}m`;
  };

  const formatBalance = (balance: number) => {
    if (balance >= 1000000) return `${(balance / 1000000).toFixed(2)}M`;
    if (balance >= 1000) return `${(balance / 1000).toFixed(1)}K`;
    return balance.toLocaleString();
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "founder":
        return (
          <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
            <Crown className="w-3 h-3 mr-1" />
            Founder
          </Badge>
        );
      case "admin":
        return (
          <Badge variant="secondary" className="text-yellow-500 border-yellow-500/50">
            <Shield className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <User className="w-3 h-3 mr-1" />
            Member
          </Badge>
        );
    }
  };

  const isOwnProfile = currentUser?.id === profile?.id;
  const canModerate = (isViewerAdmin || isViewerFounder) && !isOwnProfile && profile?.role !== "founder" && profile?.role !== "admin";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono">User Profile</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
            <Skeleton className="h-20 w-full" />
          </div>
        ) : isError || !profile ? (
          <div className="text-center py-8 text-muted-foreground">
            <UserX className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-mono">User not found</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 border-2 border-border">
                {profile.avatarUrl ? (
                  <AvatarImage src={normalizeStorageUrl(profile.avatarUrl) || undefined} />
                ) : null}
                <AvatarFallback className="bg-primary/20 text-primary text-xl">
                  {profile.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-mono font-bold text-lg">{profile.username}</h3>
                  {getRoleBadge(profile.role)}
                </div>
                {profile.isBanned && (
                  <Badge variant="destructive" className="text-xs">
                    <Ban className="w-3 h-3 mr-1" />
                    Banned
                  </Badge>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  Joined {new Date(profile.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {profile.bio && (
              <div className="bg-muted/50 rounded-md p-3">
                <p className="text-sm text-muted-foreground">{profile.bio}</p>
              </div>
            )}

            {profile.walletAddress && (
              <div className="space-y-2">
                <Separator />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Wallet className="w-4 h-4 text-primary" />
                    <span className="font-mono text-xs truncate max-w-[180px]">
                      {profile.walletAddress.slice(0, 8)}...{profile.walletAddress.slice(-6)}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={copyWallet}
                      data-testid="button-copy-wallet"
                    >
                      {copiedWallet ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <a
                      href={`https://solscan.io/account/${profile.walletAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="icon" data-testid="button-view-solscan">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                  </div>
                </div>

                {profile.holdingsVisible && (profile.balance !== undefined || profile.holdDuration !== undefined) && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {profile.balance !== undefined && profile.balance !== null && (
                      <div className="bg-muted/50 rounded-md p-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Coins className="w-3 h-3" />
                          Balance
                        </div>
                        <p className="font-mono font-bold text-primary">
                          {formatBalance(profile.balance)} $NORMIE
                        </p>
                      </div>
                    )}
                    {profile.holdDuration !== undefined && profile.holdDuration !== null && profile.holdDuration > 0 && (
                      <div className="bg-muted/50 rounded-md p-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Clock className="w-3 h-3" />
                          Holding
                        </div>
                        <p className="font-mono font-bold">
                          {formatDuration(profile.holdDuration)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {(isViewerAdmin || isViewerFounder) && !isOwnProfile && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-mono uppercase">Admin Actions</p>
                  {canModerate && (
                    <div className="flex gap-2">
                      {profile.isBanned ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => banMutation.mutate(false)}
                          disabled={banMutation.isPending}
                          data-testid="button-unban-user"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Unban User
                        </Button>
                      ) : (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => banMutation.mutate(true)}
                          disabled={banMutation.isPending}
                          data-testid="button-ban-user"
                        >
                          <Ban className="w-4 h-4 mr-1" />
                          Ban User
                        </Button>
                      )}
                    </div>
                  )}
                  {!canModerate && (
                    <p className="text-xs text-muted-foreground">
                      Cannot moderate {profile.role === "founder" ? "founder" : "admin"} accounts
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default UserProfilePopup;
