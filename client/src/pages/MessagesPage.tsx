import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  MessageSquare, 
  Users, 
  Search,
  Lock,
  UserPlus,
  Mail,
  LogIn
} from "lucide-react";

export default function MessagesPage() {
  const { isAuthenticated, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

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

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-4 p-4 max-w-4xl mx-auto">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-mono text-lg font-bold flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Private Messages
            </h1>
            <p className="text-xs text-muted-foreground">End-to-end encrypted</p>
          </div>
          <Link href="/chat">
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-public-chat">
              <MessageSquare className="w-4 h-4" />
              Public Chat
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Conversations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 font-mono text-sm"
                    data-testid="input-search-conversations"
                  />
                </div>
                
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    <div className="flex items-center justify-center h-32 text-center">
                      <div className="space-y-2">
                        <Mail className="w-8 h-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No conversations yet</p>
                        <p className="text-xs text-muted-foreground">
                          Start a conversation from someone's profile
                        </p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Friend Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-20 text-center">
                  <p className="text-sm text-muted-foreground">No pending requests</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card className="h-full min-h-[500px]">
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center space-y-4 max-w-sm">
                  <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                    <Lock className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="font-mono text-lg font-medium">Private Messaging</h3>
                  <p className="text-sm text-muted-foreground">
                    Your messages are end-to-end encrypted. Only you and your friend can read them.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Badge variant="outline" className="mx-auto">
                      <Lock className="w-3 h-3 mr-1" />
                      E2E Encrypted
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      Select a conversation or start one from a user's profile
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
