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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Clock,
  Coins,
  Copy,
  Check,
  Ban,
  UserX,
  ExternalLink,
  Calendar,
  Image,
  MessageSquare,
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
  isTemporaryBan?: boolean;
  bannedUntil?: string | null;
  stats?: {
    artSubmissions: number;
    approvedArt: number;
    chatMessages: number;
  };
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
  const [banDuration, setBanDuration] = useState<string>("permanent");

  const isViewerFounder = currentUser?.role === "founder";

  const identifier = userId || username;
  const { data: profile, isLoading, isError } = useQuery<UserProfile>({
    queryKey: ["/api/auth/users/profile", identifier],
    queryFn: async () => {
      if (!identifier) throw new Error("No identifier");
      const res = await fetch(`/api/auth/users/profile/${encodeURIComponent(identifier)}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "User not found" }));
        throw new Error(error.error || "User not found");
      }
      return res.json();
    },
    enabled: isOpen && !!identifier,
  });

  const banMutation = useMutation({
    mutationFn: async ({ ban, duration }: { ban: boolean; duration?: number }) => {
      const res = await apiRequest("POST", `/api/admin/users/${profile?.id}/ban`, { ban, duration });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update user");
      }
      return res.json();
    },
    onSuccess: (_, { ban }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/users/profile", identifier] });
      toast({
        title: ban ? "User banned" : "User unbanned",
        description: `${profile?.username} has been ${ban ? "banned" : "unbanned"}`,
      });
      setBanDuration("permanent");
    },
    onError: (error: Error) => {
      toast({
        title: "Action failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBan = () => {
    const duration = banDuration === "permanent" ? undefined : parseInt(banDuration, 10);
    banMutation.mutate({ ban: true, duration });
  };

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
                    {profile.isTemporaryBan && profile.bannedUntil 
                      ? `Banned until ${new Date(profile.bannedUntil).toLocaleDateString()}`
                      : "Banned"
                    }
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

            {profile.stats && (
              <>
                <Separator />
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-muted/50 rounded-md p-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                      <Image className="w-3 h-3" />
                      Art
                    </div>
                    <p className="font-mono font-bold">{profile.stats.artSubmissions}</p>
                    <p className="text-xs text-muted-foreground">{profile.stats.approvedArt} approved</p>
                  </div>
                  <div className="bg-muted/50 rounded-md p-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                      <MessageSquare className="w-3 h-3" />
                      Messages
                    </div>
                    <p className="font-mono font-bold">{profile.stats.chatMessages}</p>
                  </div>
                  <div className="bg-muted/50 rounded-md p-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                      <Calendar className="w-3 h-3" />
                      Member
                    </div>
                    <p className="font-mono font-bold text-sm">
                      {Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / 86400000)}d
                    </p>
                  </div>
                </div>
              </>
            )}

            {(isViewerAdmin || isViewerFounder) && !isOwnProfile && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-mono uppercase">Admin Actions</p>
                  {canModerate && (
                    <div className="space-y-2">
                      {profile.isBanned ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => banMutation.mutate({ ban: false })}
                          disabled={banMutation.isPending}
                          data-testid="button-unban-user"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Unban User
                        </Button>
                      ) : (
                        <div className="flex gap-2 items-center flex-wrap">
                          <Select value={banDuration} onValueChange={setBanDuration}>
                            <SelectTrigger className="w-32" data-testid="select-ban-duration">
                              <SelectValue placeholder="Duration" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 hour</SelectItem>
                              <SelectItem value="6">6 hours</SelectItem>
                              <SelectItem value="24">1 day</SelectItem>
                              <SelectItem value="72">3 days</SelectItem>
                              <SelectItem value="168">1 week</SelectItem>
                              <SelectItem value="720">30 days</SelectItem>
                              <SelectItem value="permanent">Permanent</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBan}
                            disabled={banMutation.isPending}
                            data-testid="button-ban-user"
                          >
                            <Ban className="w-4 h-4 mr-1" />
                            Ban
                          </Button>
                        </div>
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
