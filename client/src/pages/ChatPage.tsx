import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeStorageUrl } from "@/lib/utils";
import { 
  ArrowLeft, 
  MessageSquare, 
  Send, 
  Loader2, 
  Hash, 
  Crown, 
  LogIn, 
  User, 
  Shield,
  ArrowDown,
  Mail
} from "lucide-react";
import { UserProfilePopup } from "@/components/UserProfilePopup";
import type { ChatMessageWithAvatar } from "@shared/schema";

const DEFAULT_ROOM_ID = "00000000-0000-0000-0000-000000000001";

interface ChatMessageItemProps {
  message: ChatMessageWithAvatar;
  isOwnMessage: boolean;
  onUserClick: (senderId: string | null, senderName: string | null) => void;
}

function ChatMessageItem({ message, isOwnMessage, onUserClick }: ChatMessageItemProps) {
  const timestamp = message.createdAt ? new Date(message.createdAt) : new Date();
  const timeStr = timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  
  const senderRole = (message as any).senderRole;
  const isFounder = senderRole === "founder";
  const isAdmin = senderRole === "admin";
  const avatarUrl = message.senderAvatarUrl ? normalizeStorageUrl(message.senderAvatarUrl) : null;

  const handleClick = () => {
    onUserClick(message.senderId || null, message.senderName);
  };
  
  return (
    <div 
      className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : "flex-row"} mb-3`}
      data-testid={`chat-message-${message.id}`}
    >
      <button
        onClick={handleClick}
        className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded-full"
        data-testid={`button-avatar-${message.id}`}
      >
        <Avatar className="w-10 h-10 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={message.senderName || "User"} />
          ) : null}
          <AvatarFallback className="text-sm">
            <User className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      </button>
      <div className={`flex flex-col max-w-[75%] ${isOwnMessage ? "items-end" : "items-start"}`}>
        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={handleClick}
            className={`text-sm font-mono font-semibold cursor-pointer hover:underline focus:outline-none ${
              isFounder ? "text-yellow-500" : isAdmin ? "text-blue-500" : "text-foreground"
            }`}
            data-testid={`button-username-${message.id}`}
          >
            {isFounder && <Crown className="w-3 h-3 inline mr-1" />}
            {isAdmin && !isFounder && <Shield className="w-3 h-3 inline mr-1" />}
            {message.senderName || "Anonymous"}
          </button>
          {isFounder && (
            <Badge variant="outline" className="px-1 py-0 text-[10px] text-yellow-500 border-yellow-500/50">
              CEO
            </Badge>
          )}
          {isAdmin && !isFounder && (
            <Badge variant="outline" className="px-1 py-0 text-[10px] text-blue-500 border-blue-500/50">
              ADMIN
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">{timeStr}</span>
        </div>
        <div 
          className={`px-4 py-2 rounded-2xl text-sm ${
            isOwnMessage 
              ? "bg-primary text-primary-foreground rounded-tr-sm" 
              : "bg-muted rounded-tl-sm"
          }`}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
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
    <div className="h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between gap-4 px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h1 className="font-mono text-lg font-bold">Normie Nation Chat</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/messages">
              <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-private-messages">
                <Mail className="w-4 h-4" />
                <span className="hidden sm:inline">Private Messages</span>
                <span className="sm:hidden">DMs</span>
              </Button>
            </Link>
            <Badge variant="outline" className="font-mono text-xs">
              <Hash className="w-3 h-3 mr-1" />
              general
            </Badge>
          </div>
        </div>
        {isAuthenticated && user && (
          <div className="flex items-center gap-2 px-4 pb-2 border-b border-border/50">
            <span className="text-xs text-muted-foreground">Chatting as:</span>
            <span className="text-xs font-mono text-primary font-semibold">
              {user.username}
            </span>
          </div>
        )}
      </header>

      <div 
        ref={scrollAreaRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
            <p className="font-mono text-lg">No messages yet</p>
            <p className="text-sm">Be the first to say gm!</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-1">
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
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
          <Button
            variant="secondary"
            size="sm"
            className="gap-2 shadow-lg"
            onClick={() => scrollToBottom("smooth")}
            data-testid="button-scroll-to-bottom"
          >
            <ArrowDown className="w-4 h-4" />
            New messages
          </Button>
        </div>
      )}

      <div className="border-t border-border bg-background p-4">
        {isAuthenticated ? (
          <form onSubmit={handleSend} className="flex gap-3 max-w-4xl mx-auto">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 font-mono"
              maxLength={500}
              disabled={sendMutation.isPending}
              data-testid="input-chat-message"
            />
            <Button 
              type="submit" 
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
          <div className="flex items-center justify-center gap-2 p-4 bg-muted rounded-lg max-w-4xl mx-auto">
            <LogIn className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-mono">
              Sign in to chat with the community
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
