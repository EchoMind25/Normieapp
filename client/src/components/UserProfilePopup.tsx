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
  UserPlus,
  UserCheck,
  Loader2,
  Flag,
  ShieldX,
  ShieldCheck,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

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

interface FriendshipStatus {
  status: "none" | "pending" | "accepted" | "declined" | "blocked";
  friendship: {
    id: string;
    isRequester: boolean;
    createdAt: string;
    respondedAt: string | null;
  } | null;
}

interface UserProfilePopupProps {
  userId?: string;
  username?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfilePopup({ userId, username, isOpen, onClose }: UserProfilePopupProps) {
  const { user: currentUser, isAdmin: isViewerAdmin, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [banDuration, setBanDuration] = useState<string>("permanent");
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [reportType, setReportType] = useState<string>("harassment");
  const [reportDescription, setReportDescription] = useState("");

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

  const { data: friendshipStatus, isLoading: friendshipLoading } = useQuery<FriendshipStatus>({
    queryKey: ["/api/friends/status", profile?.id],
    queryFn: async () => {
      if (!profile?.id) throw new Error("No profile ID");
      const res = await fetch(`/api/friends/status/${profile.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch friendship status");
      return res.json();
    },
    enabled: isOpen && !!profile?.id && isAuthenticated && currentUser?.id !== profile?.id,
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error("No profile ID");
      const res = await apiRequest("POST", "/api/friends/request", { addresseeId: profile.id });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends/status", profile?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests/sent"] });
      toast({ title: "Friend request sent", description: `Request sent to ${profile?.username}` });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send request", description: error.message, variant: "destructive" });
    },
  });

  const acceptFriendRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await apiRequest("POST", `/api/friends/accept/${requestId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends/status", profile?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      toast({ title: "Friend request accepted", description: `You are now friends with ${profile?.username}` });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to accept request", description: error.message, variant: "destructive" });
    },
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

  const { data: blockStatus } = useQuery<{ isBlocked: boolean; isBlockedByThem: boolean }>({
    queryKey: ["/api/moderation/blocked-status", profile?.id],
    queryFn: async () => {
      if (!profile?.id) throw new Error("No profile ID");
      const res = await fetch(`/api/moderation/blocked-status/${profile.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch block status");
      return res.json();
    },
    enabled: isOpen && !!profile?.id && isAuthenticated && currentUser?.id !== profile?.id,
  });

  const blockMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error("No profile ID");
      const res = await apiRequest("POST", "/api/moderation/block", { blockedId: profile.id });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to block user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/moderation/blocked-status", profile?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/moderation/blocked"] });
      setShowBlockDialog(false);
      toast({ title: "User blocked", description: `${profile?.username} has been blocked` });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to block", description: error.message, variant: "destructive" });
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error("No profile ID");
      const res = await apiRequest("DELETE", `/api/moderation/block/${profile.id}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to unblock user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/moderation/blocked-status", profile?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/moderation/blocked"] });
      toast({ title: "User unblocked", description: `${profile?.username} has been unblocked` });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to unblock", description: error.message, variant: "destructive" });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error("No profile ID");
      const res = await apiRequest("POST", "/api/moderation/report", { 
        reportedUserId: profile.id,
        reportType,
        description: reportDescription || undefined,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit report");
      }
      return res.json();
    },
    onSuccess: () => {
      setShowReportDialog(false);
      setReportType("harassment");
      setReportDescription("");
      toast({ title: "Report submitted", description: "Thank you for helping keep our community safe" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to report", description: error.message, variant: "destructive" });
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

  const renderFriendButton = () => {
    if (!isAuthenticated || !profile || currentUser?.id === profile.id) return null;

    if (friendshipLoading) {
      return (
        <Button variant="outline" size="sm" disabled>
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          Loading...
        </Button>
      );
    }

    if (!friendshipStatus) return null;

    const { status, friendship } = friendshipStatus;

    if (status === "accepted") {
      return (
        <Badge variant="secondary" className="gap-1">
          <UserCheck className="w-3 h-3" />
          Friends
        </Badge>
      );
    }

    if (status === "pending" && friendship) {
      if (friendship.isRequester) {
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            Request Pending
          </Badge>
        );
      } else {
        return (
          <Button
            variant="default"
            size="sm"
            onClick={() => acceptFriendRequestMutation.mutate(friendship.id)}
            disabled={acceptFriendRequestMutation.isPending}
            data-testid="button-accept-friend-request"
          >
            {acceptFriendRequestMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <UserCheck className="w-4 h-4 mr-1" />
            )}
            Accept Request
          </Button>
        );
      }
    }

    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => sendFriendRequestMutation.mutate()}
        disabled={sendFriendRequestMutation.isPending}
        data-testid="button-send-friend-request"
      >
        {sendFriendRequestMutation.isPending ? (
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
        ) : (
          <UserPlus className="w-4 h-4 mr-1" />
        )}
        Add Friend
      </Button>
    );
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

            {!isOwnProfile && isAuthenticated && (
              <div className="flex gap-2 flex-wrap items-center">
                {renderFriendButton()}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid="button-user-actions">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {blockStatus?.isBlocked ? (
                      <DropdownMenuItem 
                        onClick={() => unblockMutation.mutate()}
                        disabled={unblockMutation.isPending}
                        data-testid="menu-item-unblock"
                      >
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        Unblock User
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem 
                        onClick={() => setShowBlockDialog(true)}
                        data-testid="menu-item-block"
                      >
                        <ShieldX className="w-4 h-4 mr-2" />
                        Block User
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => setShowReportDialog(true)}
                      className="text-destructive focus:text-destructive"
                      data-testid="menu-item-report"
                    >
                      <Flag className="w-4 h-4 mr-2" />
                      Report User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

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

      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {profile?.username}?</AlertDialogTitle>
            <AlertDialogDescription>
              Blocking this user will prevent them from messaging you, sending friend requests, 
              and seeing your content. You can unblock them at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-block">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => blockMutation.mutate()}
              disabled={blockMutation.isPending}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-block"
            >
              {blockMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <ShieldX className="w-4 h-4 mr-1" />
              )}
              Block User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report {profile?.username}</AlertDialogTitle>
            <AlertDialogDescription>
              Help us understand why you are reporting this user. Your report will be reviewed by our moderation team.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger data-testid="select-report-type">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="harassment">Harassment or bullying</SelectItem>
                  <SelectItem value="spam">Spam or scam</SelectItem>
                  <SelectItem value="inappropriate_content">Inappropriate content</SelectItem>
                  <SelectItem value="impersonation">Impersonation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Additional details (optional)</label>
              <Textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Provide any additional context..."
                className="resize-none"
                rows={3}
                data-testid="textarea-report-description"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-report">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reportMutation.mutate()}
              disabled={reportMutation.isPending}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-report"
            >
              {reportMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Flag className="w-4 h-4 mr-1" />
              )}
              Submit Report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

export default UserProfilePopup;
