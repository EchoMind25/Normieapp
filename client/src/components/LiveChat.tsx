import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeStorageUrl } from "@/lib/utils";
import { MessageSquare, Send, Users, Loader2, Hash, Crown, ShieldCheck, LogIn, User, Shield, Star, Maximize2, ArrowDown } from "lucide-react";
import { UserProfilePopup } from "./UserProfilePopup";
import type { ChatRoom, ChatMessageWithAvatar } from "@shared/schema";

const DEFAULT_ROOM_ID = "00000000-0000-0000-0000-000000000001";

interface ChatMessageItemProps {
  message: ChatMessageWithAvatar;
  isOwnMessage: boolean;
  onUserClick: (senderId: string | null, senderName: string | null) => void;
}

function ChatMessageItem({ message, isOwnMessage, onUserClick }: ChatMessageItemProps) {
  const timestamp = message.createdAt ? new Date(message.createdAt) : new Date();
  const timeStr = timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  
  // Check roles from message data - senderRole comes from the API
  const senderRole = (message as any).senderRole;
  const isFounder = senderRole === "founder";
  const isAdmin = senderRole === "admin";
  const avatarUrl = message.senderAvatarUrl ? normalizeStorageUrl(message.senderAvatarUrl) : null;

  const handleClick = () => {
    onUserClick(message.senderId || null, message.senderName);
  };
  
  return (
    <div 
      className={`flex gap-2 ${isOwnMessage ? "flex-row-reverse" : "flex-row"} mb-2`}
      data-testid={`chat-message-${message.id}`}
    >
      <button
        onClick={handleClick}
        className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded-full"
        data-testid={`button-avatar-${message.id}`}
      >
        <Avatar className="w-7 h-7 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={message.senderName || "User"} />
          ) : null}
          <AvatarFallback className="text-[10px]">
            <User className="w-3 h-3" />
          </AvatarFallback>
        </Avatar>
      </button>
      <div className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"}`}>
        <div className="flex items-center gap-2 mb-0.5">
          <button
            onClick={handleClick}
            className={`text-xs font-mono font-semibold cursor-pointer hover:underline focus:outline-none ${
              isFounder ? "text-yellow-500" : isAdmin ? "text-blue-500" : "text-primary"
            }`}
            data-testid={`button-username-${message.id}`}
          >
            {isFounder && <Crown className="w-3 h-3 inline mr-1" />}
            {isAdmin && !isFounder && <Shield className="w-3 h-3 inline mr-1" />}
            {message.senderName || "Anonymous"}
            {isFounder && (
              <Badge variant="outline" className="ml-1 px-1 py-0 text-[10px] text-yellow-500 border-yellow-500/50">
                CEO
              </Badge>
            )}
            {isAdmin && !isFounder && (
              <Badge variant="outline" className="ml-1 px-1 py-0 text-[10px] text-blue-500 border-blue-500/50">
                ADMIN
              </Badge>
            )}
          </button>
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
    </div>
  );
}

export function LiveChat() {
  const [message, setMessage] = useState("");
  const [profilePopup, setProfilePopup] = useState<{ isOpen: boolean; userId?: string; username?: string }>({
    isOpen: false,
  });
  const [userScrolled, setUserScrolled] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  const { data: messages = [], isLoading, refetch } = useQuery<ChatMessageWithAvatar[]>({
    queryKey: ["/api/chat/rooms", DEFAULT_ROOM_ID, "messages"],
    refetchInterval: 3000,
  });

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    // Use container-local scrolling to avoid scrolling the entire document
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: behavior === "instant" ? "instant" : "smooth"
      });
    }
    setUserScrolled(false);
    setShowScrollButton(false);
  }, []);

  useEffect(() => {
    if (messages.length > 0 && messages.length !== prevMessageCountRef.current) {
      if (!userScrolled) {
        scrollToBottom("smooth");
      } else if (messages.length > prevMessageCountRef.current) {
        setShowScrollButton(true);
      }
      prevMessageCountRef.current = messages.length;
    }
  }, [messages.length, userScrolled, scrollToBottom]);

  useEffect(() => {
    if (messages.length > 0 && prevMessageCountRef.current === 0) {
      setTimeout(() => scrollToBottom("instant"), 100);
      prevMessageCountRef.current = messages.length;
    }
  }, [messages.length, scrollToBottom]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 50;
    
    if (isAtBottom) {
      setUserScrolled(false);
      setShowScrollButton(false);
    } else {
      setUserScrolled(true);
    }
  }, []);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/chat/rooms/${DEFAULT_ROOM_ID}/messages`, { 
        content
      });
    },
    onSuccess: () => {
      setMessage("");
      refetch();
      setUserScrolled(false);
      setTimeout(() => scrollToBottom("smooth"), 100);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send message. Please sign in first.", variant: "destructive" });
    },
  });

  const handleUserClick = (senderId: string | null, senderName: string | null) => {
    if (senderId || senderName) {
      setProfilePopup({
        isOpen: true,
        userId: senderId || undefined,
        username: senderName || undefined,
      });
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !isAuthenticated) return;
    sendMutation.mutate(message);
  };

  return (
    <Card className="h-[500px] flex flex-col relative">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 font-mono text-lg">
            <MessageSquare className="w-5 h-5 text-primary" />
            Normie Nation Chat
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              <Hash className="w-3 h-3 mr-1" />
              general
            </Badge>
            <Link href="/chat">
              <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="button-fullscreen-chat">
                <Maximize2 className="w-4 h-4" />
              </Button>
            </Link>
          </div>
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
        <div 
          ref={scrollAreaRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto pr-2"
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
                  isOwnMessage={isAuthenticated && user?.username === msg.senderName}
                  onUserClick={handleUserClick}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
          
          <UserProfilePopup
            isOpen={profilePopup.isOpen}
            userId={profilePopup.userId}
            username={profilePopup.username}
            onClose={() => setProfilePopup({ isOpen: false })}
          />
        </div>

        {showScrollButton && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
            <Button
              variant="secondary"
              size="sm"
              className="gap-1 shadow-lg text-xs"
              onClick={() => scrollToBottom("smooth")}
              data-testid="button-scroll-to-bottom"
            >
              <ArrowDown className="w-3 h-3" />
              New messages
            </Button>
          </div>
        )}
        
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