import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { normalizeStorageUrl } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { UserProfilePopup } from "@/components/UserProfilePopup";
import {
  UserPlus,
  UserCheck,
  UserX,
  Loader2,
  Inbox,
} from "lucide-react";

interface FriendRequest {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: string;
  createdAt: string;
  requester: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
}

export function FriendRequests() {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: requests, isLoading, isError } = useQuery<FriendRequest[]>({
    queryKey: ["/api/friends/requests/pending"],
  });

  const acceptMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await apiRequest("POST", `/api/friends/accept/${requestId}`);
      return res.json();
    },
    onSuccess: (_, requestId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      const request = requests?.find(r => r.id === requestId);
      toast({
        title: "Friend request accepted",
        description: request ? `You are now friends with ${request.requester.username}` : "Friend added!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to accept request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await apiRequest("POST", `/api/friends/decline/${requestId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests/pending"] });
      toast({ title: "Friend request declined" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to decline request",
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
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <UserX className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Failed to load requests</p>
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm font-mono">No pending requests</p>
        <p className="text-xs mt-1">Friend requests will appear here</p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-[300px]">
        <div className="space-y-2">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center gap-3 p-3 rounded-md bg-muted/50"
              data-testid={`friend-request-${request.id}`}
            >
              <button
                onClick={() => setSelectedUserId(request.requester.id)}
                className="flex items-center gap-3 flex-1 text-left"
                data-testid={`button-view-profile-${request.requester.id}`}
              >
                <Avatar className="h-10 w-10 border border-border">
                  {request.requester.avatarUrl ? (
                    <AvatarImage src={normalizeStorageUrl(request.requester.avatarUrl) || undefined} />
                  ) : null}
                  <AvatarFallback className="bg-primary/20 text-primary text-sm">
                    {request.requester.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-mono font-medium text-sm truncate">{request.requester.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </button>
              <div className="flex gap-1">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => acceptMutation.mutate(request.id)}
                  disabled={acceptMutation.isPending || declineMutation.isPending}
                  data-testid={`button-accept-request-${request.id}`}
                >
                  {acceptMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => declineMutation.mutate(request.id)}
                  disabled={acceptMutation.isPending || declineMutation.isPending}
                  data-testid={`button-decline-request-${request.id}`}
                >
                  {declineMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserX className="w-4 h-4" />
                  )}
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
    </>
  );
}

export default FriendRequests;
