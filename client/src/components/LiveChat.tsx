import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, Send, Users, Loader2, Hash, Crown, ShieldCheck, LogIn } from "lucide-react";
import type { ChatRoom, ChatMessage } from "@shared/schema";

const DEFAULT_ROOM_ID = "00000000-0000-0000-0000-000000000001";

interface ChatMessageItemProps {
  message: ChatMessage;
  isOwnMessage: boolean;
}

// Check if username is the official Normie admin
function isNormieAdmin(name: string | null | undefined): boolean {
  if (!name) return false;
  return name.toLowerCase() === "normie";
}

function ChatMessageItem({ message, isOwnMessage }: ChatMessageItemProps) {
  const timestamp = message.createdAt ? new Date(message.createdAt) : new Date();
  const timeStr = timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const isAdmin = isNormieAdmin(message.senderName);
  
  return (
    <div 
      className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"} mb-2`}
      data-testid={`chat-message-${message.id}`}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <span className={`text-xs font-mono font-semibold ${isAdmin ? "text-yellow-500" : "text-primary"}`}>
          {isAdmin && <Crown className="w-3 h-3 inline mr-1" />}
          {message.senderName || "Anonymous"}
          {isAdmin && (
            <Badge variant="outline" className="ml-1 px-1 py-0 text-[10px] text-yellow-500 border-yellow-500/50">
              CEO
            </Badge>
          )}
        </span>
        <span className="text-xs text-muted-foreground">{timeStr}</span>
      </div>
      <div 
        className={`max-w-[85%] px-3 py-1.5 rounded-lg text-sm touch-press ${
          isOwnMessage 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

export function LiveChat() {
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  const { data: messages = [], isLoading, refetch } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/rooms", DEFAULT_ROOM_ID, "messages"],
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/chat/rooms/${DEFAULT_ROOM_ID}/messages`, { 
        content
      });
    },
    onSuccess: () => {
      setMessage("");
      refetch();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send message. Please sign in first.", variant: "destructive" });
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !isAuthenticated) return;
    sendMutation.mutate(message);
  };

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 font-mono text-lg">
            <MessageSquare className="w-5 h-5 text-primary" />
            Normie Nation Chat
          </CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            <Hash className="w-3 h-3 mr-1" />
            general
          </Badge>
        </div>
        {isAuthenticated && user && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">Chatting as:</span>
            <span className="text-xs font-mono text-primary font-semibold">
              {user.username}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden p-3">
        <ScrollArea className="flex-1 pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquare className="w-10 h-10 mb-2 opacity-50" />
              <p className="font-mono text-sm">No messages yet</p>
              <p className="text-xs">Be the first to say gm!</p>
            </div>
          ) : (
            <div className="space-y-1 p-1">
              {messages.map((msg) => (
                <ChatMessageItem
                  key={msg.id}
                  message={msg}
                  isOwnMessage={isAuthenticated && user?.username === msg.senderName}
                />
              ))}
            </div>
          )}
        </ScrollArea>
        
        {isAuthenticated ? (
          <form onSubmit={handleSend} className="flex gap-2 mt-3 pt-3 border-t">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 font-mono text-sm"
              maxLength={500}
              disabled={sendMutation.isPending}
              data-testid="input-chat-message"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={sendMutation.isPending || !message.trim()}
              data-testid="button-send-message"
            >
              {sendMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        ) : (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t p-3 bg-muted rounded-lg">
            <LogIn className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-mono">
              Sign in to chat
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default LiveChat;