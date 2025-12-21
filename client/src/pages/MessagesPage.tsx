import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  generateKeyPair,
  getStoredPrivateKey,
  storePrivateKey,
  hasStoredPrivateKey,
  generatePublicKeyFromPrivate,
  initializeEncryptionKeys,
} from "@/lib/encryption";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FriendRequests } from "@/components/FriendRequests";
import { FriendsList } from "@/components/FriendsList";
import { ConversationList } from "@/components/ConversationList";
import { MessageThread } from "@/components/MessageThread";
import { NewConversationDialog } from "@/components/NewConversationDialog";
import {
  ArrowLeft,
  MessageSquare,
  Users,
  Lock,
  UserPlus,
  Mail,
  LogIn,
  Loader2,
  Shield,
} from "lucide-react";

interface Participant {
  id: string;
  username: string;
  avatarUrl: string | null;
}

interface EncryptionKey {
  id: string;
  userId: string;
  publicKey: string;
  keyVersion: number;
  createdAt: string;
  updatedAt: string;
}

export default function MessagesPage() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const targetUserId = searchParams.get("user");

  const [selectedConversation, setSelectedConversation] = useState<{
    id: string;
    participant: Participant;
  } | null>(null);
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);
  const [isSettingUpEncryption, setIsSettingUpEncryption] = useState(false);

  const { data: myKey, isLoading: keyLoading } = useQuery<EncryptionKey | null>({
    queryKey: ["/api/messages/keys/me"],
    enabled: isAuthenticated,
  });

  const uploadKeyMutation = useMutation({
    mutationFn: async (publicKey: string) => {
      return apiRequest("POST", "/api/messages/keys", { publicKey });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/keys/me"] });
    },
  });

  const createConversationMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", "/api/messages/conversations", {
        userId,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      setSelectedConversation({
        id: data.id,
        participant: data.participant,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not start conversation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const setupEncryption = async () => {
      if (!isAuthenticated || keyLoading) return;

      setIsSettingUpEncryption(true);

      try {
        const storedPrivateKey = await initializeEncryptionKeys();

        if (storedPrivateKey) {
          const localPublicKey = generatePublicKeyFromPrivate(storedPrivateKey);

          if (!myKey) {
            await uploadKeyMutation.mutateAsync(localPublicKey);
          } else if (myKey.publicKey !== localPublicKey) {
            await uploadKeyMutation.mutateAsync(localPublicKey);
          }
        } else if (!myKey) {
          const keyPair = generateKeyPair();
          await storePrivateKey(keyPair.privateKey);
          await uploadKeyMutation.mutateAsync(keyPair.publicKey);
        } else {
          const keyPair = generateKeyPair();
          await storePrivateKey(keyPair.privateKey);
          await uploadKeyMutation.mutateAsync(keyPair.publicKey);
          toast({
            title: "New encryption key generated",
            description:
              "A new encryption key was created. Previously encrypted messages may not be readable.",
          });
        }
      } catch (error) {
        console.error("Failed to setup encryption:", error);
      } finally {
        setIsSettingUpEncryption(false);
      }
    };

    setupEncryption();
  }, [isAuthenticated, myKey, keyLoading]);

  useEffect(() => {
    if (targetUserId && isAuthenticated && !keyLoading && hasStoredPrivateKey()) {
      createConversationMutation.mutate(targetUserId);
    }
  }, [targetUserId, isAuthenticated, keyLoading]);

  const handleSelectConversation = (conversationId: string, participant: Participant) => {
    setSelectedConversation({ id: conversationId, participant });
  };

  const handleNewConversation = () => {
    setShowNewConversationDialog(true);
  };

  const handleConversationCreated = (conversationId: string, participant: Participant) => {
    setSelectedConversation({ id: conversationId, participant });
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-muted-foreground" />
            </div>
            <CardTitle className="font-mono">Private Messages</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground text-sm">
              Sign in to access your private messages and connect with friends.
            </p>
            <Link href="/login">
              <Button className="gap-2" data-testid="button-login-messages">
                <LogIn className="w-4 h-4" />
                Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (keyLoading || isSettingUpEncryption) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground font-mono">
              Setting up encryption...
            </p>
            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>Generating secure keys</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-4 p-4 max-w-6xl mx-auto">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-mono text-lg font-bold flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Messages & Friends
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Lock className="w-3 h-3" />
              End-to-end encrypted
            </p>
          </div>
          <Link href="/chat">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              data-testid="button-public-chat"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Public Chat</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        <Tabs defaultValue="messages" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger
              value="messages"
              data-testid="tab-messages"
              className="gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="friends" data-testid="tab-friends" className="gap-2">
              <Users className="w-4 h-4" />
              Friends
            </TabsTrigger>
            <TabsTrigger
              value="requests"
              data-testid="tab-requests"
              className="gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="messages">
            <div className="grid gap-4 md:grid-cols-3 h-[600px]">
              <div
                className={`md:col-span-1 ${
                  selectedConversation ? "hidden md:block" : ""
                }`}
              >
                <Card className="h-full">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-sm font-mono flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Conversations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 h-[calc(100%-60px)]">
                    <ConversationList
                      selectedConversationId={selectedConversation?.id || null}
                      onSelectConversation={handleSelectConversation}
                      onNewConversation={handleNewConversation}
                    />
                  </CardContent>
                </Card>
              </div>

              <div
                className={`md:col-span-2 ${
                  !selectedConversation ? "hidden md:block" : ""
                }`}
              >
                <Card className="h-full">
                  {selectedConversation ? (
                    <MessageThread
                      conversationId={selectedConversation.id}
                      recipientId={selectedConversation.participant.id}
                      recipientUsername={selectedConversation.participant.username}
                      recipientAvatarUrl={selectedConversation.participant.avatarUrl}
                      onBack={handleBackToList}
                    />
                  ) : (
                    <CardContent className="flex items-center justify-center h-full">
                      <div className="text-center space-y-4 max-w-sm">
                        <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                          <Lock className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <h3 className="font-mono text-lg font-medium">
                          Private Messaging
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Your messages are end-to-end encrypted. Only you and your
                          friend can read them.
                        </p>
                        <Button
                          onClick={handleNewConversation}
                          className="gap-2"
                          data-testid="button-start-conversation"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Start a Conversation
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="friends">
            <Card>
              <CardHeader>
                <CardTitle className="font-mono flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Your Friends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FriendsList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle className="font-mono flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Friend Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FriendRequests />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <NewConversationDialog
        open={showNewConversationDialog}
        onOpenChange={setShowNewConversationDialog}
        onConversationCreated={handleConversationCreated}
      />
    </div>
  );
}
