import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Users, Loader2, Hash } from "lucide-react";
import type { ChatRoom, ChatMessage } from "@shared/schema";

const DEFAULT_ROOM_ID = "00000000-0000-0000-0000-000000000001";

function getVisitorName(): string {
  let name = localStorage.getItem("normie_chat_name");
  if (!name) {
    name = `Normie_${Math.random().toString(36).substr(2, 6)}`;
    localStorage.setItem("normie_chat_name", name);
  }
  return name;
}

function setVisitorName(name: string): void {
  localStorage.setItem("normie_chat_name", name);
}

interface ChatMessageItemProps {
  message: ChatMessage;
  isOwnMessage: boolean;
}

function ChatMessageItem({ message, isOwnMessage }: ChatMessageItemProps) {
  const timestamp = message.createdAt ? new Date(message.createdAt) : new Date();
  const timeStr = timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  
  return (
    <div 
      className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"} mb-2`}
      data-testid={`chat-message-${message.id}`}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-xs font-mono font-semibold text-primary">
          {message.senderName || "Anonymous"}
        </span>
        <span className="text-xs text-muted-foreground">{timeStr}</span>
      </div>
      <div 
        className={`max-w-[85%] px-3 py-1.5 rounded-lg text-sm ${
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
  const [userName, setUserName] = useState(getVisitorName());
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: messages = [], isLoading, refetch } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/rooms", DEFAULT_ROOM_ID, "messages"],
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/chat/rooms/${DEFAULT_ROOM_ID}/messages`, { 
        content, 
        senderName: userName 
      });
    },
    onSuccess: () => {
      setMessage("");
      refetch();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    },
  });

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMutation.mutate(message);
  };

  const handleNameSave = () => {
    if (tempName.trim()) {
      setUserName(tempName.trim());
      setVisitorName(tempName.trim());
    }
    setIsEditingName(false);
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
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground">Your name:</span>
          {isEditingName ? (
            <div className="flex items-center gap-1">
              <Input
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="h-6 w-28 text-xs font-mono"
                maxLength={20}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
                data-testid="input-chat-name-edit"
              />
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={handleNameSave}>
                Save
              </Button>
            </div>
          ) : (
            <button
              onClick={() => {
                setTempName(userName);
                setIsEditingName(true);
              }}
              className="text-xs font-mono text-primary hover:underline"
              data-testid="button-edit-name"
            >
              {userName}
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden p-3">
        <ScrollArea 
          className="flex-1 pr-2" 
          ref={scrollRef as any}
        >
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
                  isOwnMessage={msg.senderName === userName}
                />
              ))}
            </div>
          )}
        </ScrollArea>
        
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
      </CardContent>
    </Card>
  );
}

export default LiveChat;