import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { normalizeStorageUrl } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  MessageSquare,
  Users,
  Loader2,
} from "lucide-react";

interface Friend {
  id: string;
  friendshipId: string;
  username: string;
  avatarUrl: string | null;
}

interface Participant {
  id: string;
  username: string;
  avatarUrl: string | null;
}

interface ConversationResponse {
  id: string;
  participant: Participant;
  lastMessageAt: string | null;
  createdAt: string;
}

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (conversationId: string, participant: Participant) => void;
}

export function NewConversationDialog({
  open,
  onOpenChange,
  onConversationCreated,
}: NewConversationDialogProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: friends, isLoading } = useQuery<Friend[]>({
    queryKey: ["/api/friends"],
    enabled: open,
  });

  const createConversationMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", "/api/messages/conversations", {
        userId,
      });
      return res.json() as Promise<ConversationResponse>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      onConversationCreated(data.id, data.participant);
      onOpenChange(false);
      setSearchQuery("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start conversation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredFriends = friends?.filter((friend) =>
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            New Message
          </DialogTitle>
          <DialogDescription>
            Select a friend to start an encrypted conversation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 font-mono text-sm"
              data-testid="input-search-friends"
            />
          </div>

          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-md">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : !filteredFriends || filteredFriends.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                <Users className="w-10 h-10 text-muted-foreground mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground font-mono">
                  {searchQuery ? "No friends found" : "No friends yet"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {searchQuery
                    ? "Try a different search term"
                    : "Add friends from their profile to message them"}
                </p>
              </div>
            ) : (
              <div className="space-y-1 p-1">
                {filteredFriends.map((friend) => (
                  <Button
                    key={friend.id}
                    variant="ghost"
                    className="w-full justify-start gap-3 h-auto py-3"
                    onClick={() => createConversationMutation.mutate(friend.id)}
                    disabled={createConversationMutation.isPending}
                    data-testid={`button-select-friend-${friend.id}`}
                  >
                    <Avatar className="h-10 w-10 border border-border">
                      {friend.avatarUrl ? (
                        <AvatarImage
                          src={normalizeStorageUrl(friend.avatarUrl) || undefined}
                          alt={friend.username}
                        />
                      ) : null}
                      <AvatarFallback className="bg-primary/20 text-primary text-sm">
                        {friend.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-mono font-medium">{friend.username}</span>
                    {createConversationMutation.isPending &&
                      createConversationMutation.variables === friend.id && (
                        <Loader2 className="w-4 h-4 animate-spin ml-auto" />
                      )}
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NewConversationDialog;
