import { useQuery } from "@tanstack/react-query";
import { normalizeStorageUrl } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import {
  MessageSquare,
  Plus,
  User,
} from "lucide-react";

interface Participant {
  id: string;
  username: string;
  avatarUrl: string | null;
}

interface Conversation {
  id: string;
  participant: Participant | null;
  lastMessageAt: string | null;
  lastMessage: {
    id: string;
    senderId: string;
    createdAt: string;
    isRead: boolean;
  } | null;
  unreadCount: number;
  createdAt: string;
}

interface ConversationListProps {
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string, participant: Participant) => void;
  onNewConversation: () => void;
}

export function ConversationList({
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationListProps) {
  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/messages/conversations"],
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <Button
          onClick={onNewConversation}
          className="w-full gap-2"
          data-testid="button-new-conversation"
        >
          <Plus className="w-4 h-4" />
          New Message
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {!conversations || conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4">
            <MessageSquare className="w-10 h-10 text-muted-foreground mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground font-mono">No conversations yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start a conversation with your friends
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => conv.participant && onSelectConversation(conv.id, conv.participant)}
                className={`w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors hover-elevate ${
                  selectedConversationId === conv.id
                    ? "bg-primary/10"
                    : "bg-transparent"
                }`}
                data-testid={`conversation-item-${conv.id}`}
              >
                <Avatar className="h-10 w-10 border border-border flex-shrink-0">
                  {conv.participant?.avatarUrl ? (
                    <AvatarImage
                      src={normalizeStorageUrl(conv.participant.avatarUrl) || undefined}
                      alt={conv.participant.username}
                    />
                  ) : null}
                  <AvatarFallback className="bg-primary/20 text-primary text-sm">
                    {conv.participant?.username?.slice(0, 2).toUpperCase() || (
                      <User className="w-4 h-4" />
                    )}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-medium text-sm truncate">
                      {conv.participant?.username || "Unknown"}
                    </span>
                    {conv.lastMessageAt && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground truncate">
                      {conv.lastMessage ? "Encrypted message" : "No messages yet"}
                    </span>
                    {conv.unreadCount > 0 && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export default ConversationList;
