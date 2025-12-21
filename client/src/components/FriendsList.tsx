import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { normalizeStorageUrl } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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
import { UserProfilePopup } from "@/components/UserProfilePopup";
import {
  Users,
  MessageSquare,
  UserMinus,
  Loader2,
} from "lucide-react";

interface Friend {
  id: string;
  friendshipId: string;
  username: string;
  avatarUrl: string | null;
}

export function FriendsList() {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [unfriendTarget, setUnfriendTarget] = useState<Friend | null>(null);

  const { data: friends, isLoading, isError } = useQuery<Friend[]>({
    queryKey: ["/api/friends"],
  });

  const unfriendMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      const res = await apiRequest("DELETE", `/api/friends/${friendshipId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      toast({
        title: "Friend removed",
        description: unfriendTarget ? `You are no longer friends with ${unfriendTarget.username}` : "Friend removed",
      });
      setUnfriendTarget(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to unfriend",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Failed to load friends</p>
      </div>
    );
  }

  if (!friends || friends.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm font-mono">No friends yet</p>
        <p className="text-xs mt-1">Add friends from their profile</p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {friends.map((friend) => (
            <div
              key={friend.id}
              className="flex items-center gap-3 p-3 rounded-md bg-muted/50"
              data-testid={`friend-item-${friend.id}`}
            >
              <button
                onClick={() => setSelectedUserId(friend.id)}
                className="flex items-center gap-3 flex-1 text-left"
                data-testid={`button-view-friend-profile-${friend.id}`}
              >
                <Avatar className="h-10 w-10 border border-border">
                  {friend.avatarUrl ? (
                    <AvatarImage src={normalizeStorageUrl(friend.avatarUrl) || undefined} />
                  ) : null}
                  <AvatarFallback className="bg-primary/20 text-primary text-sm">
                    {friend.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-mono font-medium text-sm truncate">{friend.username}</p>
                </div>
              </button>
              <div className="flex gap-1">
                <Link href={`/messages?user=${friend.id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid={`button-message-friend-${friend.id}`}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUnfriendTarget(friend)}
                  data-testid={`button-unfriend-${friend.id}`}
                >
                  <UserMinus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <UserProfilePopup
        userId={selectedUserId || undefined}
        isOpen={!!selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />

      <AlertDialog open={!!unfriendTarget} onOpenChange={(open) => !open && setUnfriendTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono">Remove Friend</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="font-mono font-bold">{unfriendTarget?.username}</span> from your friends?
              You can send them a friend request again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-unfriend">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => unfriendTarget && unfriendMutation.mutate(unfriendTarget.friendshipId)}
              disabled={unfriendMutation.isPending}
              data-testid="button-confirm-unfriend"
            >
              {unfriendMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : null}
              Remove Friend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default FriendsList;
