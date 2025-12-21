import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { normalizeStorageUrl } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  getStoredPrivateKey,
  encryptMessage,
  decryptMessage,
} from "@/lib/encryption";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import {
  Send,
  Loader2,
  Lock,
  User,
  ArrowDown,
  AlertCircle,
} from "lucide-react";

interface Sender {
  id: string;
  username: string;
  avatarUrl: string | null;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  encryptedContent: string;
  nonce: string | null;
  isRead: boolean;
  isDeleted: boolean;
  createdAt: string;
  sender: Sender | null;
}

interface EncryptionKey {
  id: string;
  userId: string;
  publicKey: string;
  keyVersion: number;
  createdAt: string;
  updatedAt: string;
}

interface MessageThreadProps {
  conversationId: string;
  recipientId: string;
  recipientUsername: string;
  recipientAvatarUrl?: string | null;
  onBack?: () => void;
}

export function MessageThread({
  conversationId,
  recipientId,
  recipientUsername,
  recipientAvatarUrl,
  onBack,
}: MessageThreadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messageInput, setMessageInput] = useState("");
  const [userScrolled, setUserScrolled] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages/conversations", conversationId, "messages"],
    refetchInterval: 3000,
  });

  const { data: recipientKey } = useQuery<EncryptionKey | null>({
    queryKey: ["/api/messages/keys", recipientId],
    enabled: !!recipientId,
  });

  const { data: myKey } = useQuery<EncryptionKey | null>({
    queryKey: ["/api/messages/keys/me"],
  });

  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/messages/conversations/${conversationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const privateKey = getStoredPrivateKey();
      if (!privateKey) {
        throw new Error("Encryption key not found. Please refresh the page.");
      }
      if (!recipientKey?.publicKey) {
        throw new Error("Recipient's public key not available");
      }

      const { encrypted, nonce } = encryptMessage(
        content,
        recipientKey.publicKey,
        privateKey
      );

      return apiRequest("POST", `/api/messages/conversations/${conversationId}/messages`, {
        encryptedContent: encrypted,
        nonce,
      });
    },
    onSuccess: () => {
      setMessageInput("");
      queryClient.invalidateQueries({
        queryKey: ["/api/messages/conversations", conversationId, "messages"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      setUserScrolled(false);
      setTimeout(() => scrollToBottom("smooth"), 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: behavior === "instant" ? "instant" : "smooth",
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

  useEffect(() => {
    if (conversationId && messages.some((m) => m.senderId !== user?.id && !m.isRead)) {
      markAsReadMutation.mutate();
    }
  }, [conversationId, messages, user?.id]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const isAtBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight < 50;

    if (isAtBottom) {
      setUserScrolled(false);
      setShowScrollButton(false);
    } else {
      setUserScrolled(true);
    }
  }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    sendMessageMutation.mutate(messageInput);
  };

  const decryptAndRenderMessage = (msg: Message): string => {
    if (!msg.nonce || msg.isDeleted) {
      return msg.isDeleted ? "[Message deleted]" : "[Unable to decrypt]";
    }

    const privateKey = getStoredPrivateKey();
    if (!privateKey) {
      return "[Encryption key not found]";
    }

    const isOwnMessage = msg.senderId === user?.id;
    let senderPublicKey: string | null = null;

    if (isOwnMessage) {
      senderPublicKey = myKey?.publicKey || null;
    } else {
      senderPublicKey = recipientKey?.publicKey || null;
    }

    if (!senderPublicKey) {
      return "[Sender key not available]";
    }

    const decrypted = decryptMessage(
      msg.encryptedContent,
      msg.nonce,
      senderPublicKey,
      privateKey
    );

    return decrypted || "[Unable to decrypt]";
  };

  if (messagesLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : ""}`}>
              <Skeleton className={`h-12 ${i % 2 === 0 ? "w-48" : "w-56"}`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border flex items-center gap-3">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="md:hidden"
            data-testid="button-back-to-conversations"
          >
            <ArrowDown className="w-4 h-4 rotate-90" />
          </Button>
        )}
        <Avatar className="h-10 w-10 border border-border">
          {recipientAvatarUrl ? (
            <AvatarImage
              src={normalizeStorageUrl(recipientAvatarUrl) || undefined}
              alt={recipientUsername}
            />
          ) : null}
          <AvatarFallback className="bg-primary/20 text-primary text-sm">
            {recipientUsername.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-mono font-medium text-sm">{recipientUsername}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" />
            <span>End-to-end encrypted</span>
          </div>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 relative"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Lock className="w-10 h-10 text-muted-foreground mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground font-mono">
              Start your encrypted conversation
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Messages are end-to-end encrypted
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isOwnMessage = msg.senderId === user?.id;
              const decryptedContent = decryptAndRenderMessage(msg);
              const timestamp = new Date(msg.createdAt);

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}
                  data-testid={`message-${msg.id}`}
                >
                  <Avatar className="w-7 h-7 flex-shrink-0">
                    {(isOwnMessage ? user?.avatarUrl : recipientAvatarUrl) ? (
                      <AvatarImage
                        src={
                          normalizeStorageUrl(
                            isOwnMessage ? user?.avatarUrl : recipientAvatarUrl
                          ) || undefined
                        }
                      />
                    ) : null}
                    <AvatarFallback className="text-[10px]">
                      <User className="w-3 h-3" />
                    </AvatarFallback>
                  </Avatar>

                  <div
                    className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[280px] px-3 py-2 rounded-lg text-sm ${
                        isOwnMessage
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      } ${
                        decryptedContent.startsWith("[")
                          ? "italic opacity-70"
                          : ""
                      }`}
                    >
                      {decryptedContent.startsWith("[") && (
                        <AlertCircle className="w-3 h-3 inline mr-1" />
                      )}
                      {decryptedContent}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                      {formatDistanceToNow(timestamp, { addSuffix: true })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showScrollButton && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
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
      </div>

      <form
        onSubmit={handleSend}
        className="flex gap-2 p-3 border-t border-border"
      >
        <Input
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 font-mono text-sm"
          maxLength={2000}
          disabled={sendMessageMutation.isPending || !recipientKey}
          data-testid="input-message"
        />
        <Button
          type="submit"
          size="icon"
          disabled={
            sendMessageMutation.isPending ||
            !messageInput.trim() ||
            !recipientKey
          }
          data-testid="button-send-message"
        >
          {sendMessageMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>
    </div>
  );
}

export default MessageThread;
