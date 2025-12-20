import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { normalizeStorageUrl } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { 
  ArrowLeft, Users, Shield, Activity, Settings, Plus, Trash2, TrendingUp, Calendar,
  Image, Check, X, Star, Eye, MessageSquare, Loader2, BarChart3, Bell, Send, ExternalLink,
  Ban, Mail, LogOut, Edit3, Upload, Palette, ToggleLeft, ToggleRight
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { AdminMobileNavbar } from "@/components/AdminMobileNavbar";
import type { GalleryItem, Poll } from "@shared/schema";

interface ManualDevBuy {
  id: string;
  timestamp: string;
  amount: string;
  price: string;
  label: string | null;
  createdAt: string;
}

export default function Admin() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  
  const [timestamp, setTimestamp] = useState("");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [label, setLabel] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollDuration, setPollDuration] = useState("24");
  
  const [streamTitle, setStreamTitle] = useState("Normie Nation Stream Alert");
  const [streamMessage, setStreamMessage] = useState("");
  const [streamUrl, setStreamUrl] = useState("https://pump.fun/coin/FrSFwE2BxWADEyUWFXDMAeomzuB4r83ZvzdG9sevpump");
  
  const [adminArtTitle, setAdminArtTitle] = useState("");
  const [adminArtDescription, setAdminArtDescription] = useState("");
  const [adminArtFile, setAdminArtFile] = useState<File | null>(null);
  const [adminArtTags, setAdminArtTags] = useState("");
  const [deletingPollId, setDeletingPollId] = useState<string | null>(null);
  const [rejectingItemId, setRejectingItemId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  
  // User Management State
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  
  // Favicon Management State
  const [newFaviconName, setNewFaviconName] = useState("");
  const [newFaviconFile, setNewFaviconFile] = useState<File | null>(null);

  const { uploadFile, isUploading: isUploadingAdminArt } = useUpload();
  const { uploadFile: uploadFavicon, isUploading: isUploadingFavicon } = useUpload();

  const { data: manualDevBuys = [], isLoading: loadingBuys } = useQuery<ManualDevBuy[]>({
    queryKey: ["/api/admin/dev-buys"],
    enabled: isAuthenticated && user?.role === "admin",
  });

  const { data: pendingGallery = [], isLoading: loadingPending, refetch: refetchPending } = useQuery<GalleryItem[]>({
    queryKey: ["/api/admin/gallery/pending"],
    enabled: isAuthenticated && user?.role === "admin",
  });

  const { data: allGallery = [], refetch: refetchGallery } = useQuery<GalleryItem[]>({
    queryKey: ["/api/gallery"],
    enabled: isAuthenticated && user?.role === "admin",
  });

  const { data: polls = [], refetch: refetchPolls } = useQuery<Poll[]>({
    queryKey: ["/api/admin/polls"],
    enabled: isAuthenticated && user?.role === "admin",
  });

  const { data: stats, isLoading: loadingStats } = useQuery<{ totalUsers: number }>({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated && user?.role === "admin",
  });

  // User Management Queries
  interface AdminUser {
    id: string;
    username: string;
    email: string | null;
    walletAddress: string | null;
    role: string | null;
    avatarUrl: string | null;
    bannedAt: string | null;
    createdAt: string | null;
    messageCount: number;
    galleryCount: number;
  }
  
  const { data: allUsers = [], refetch: refetchUsers } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated && user?.role === "admin",
  });

  interface UserDetails {
    user: AdminUser;
    messages: Array<{ id: string; content: string; roomId: string; createdAt: string }>;
    gallery: Array<{ id: string; title: string; imageUrl: string; status: string; createdAt: string }>;
  }
  
  const { data: userDetails, isLoading: loadingUserDetails } = useQuery<UserDetails>({
    queryKey: ["/api/admin/users", selectedUserId],
    enabled: !!selectedUserId && isAuthenticated && user?.role === "admin",
  });

  // Favicon Management Queries
  interface AdminFavicon {
    id: string;
    name: string;
    fileUrl: string;
    isActive: boolean;
    createdAt: string | null;
  }
  
  const { data: favicons = [], refetch: refetchFavicons } = useQuery<AdminFavicon[]>({
    queryKey: ["/api/admin/favicons"],
    enabled: isAuthenticated && user?.role === "admin",
  });

  const addDevBuyMutation = useMutation({
    mutationFn: async (data: { timestamp: string; amount: number; price: number; label?: string }) => {
      const res = await apiRequest("POST", "/api/admin/dev-buys", data);
      if (!res.ok) throw new Error("Failed to add dev buy");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dev-buys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dev-buys"] });
      toast({ title: "Dev buy added", description: "The chart marker has been added" });
      setTimestamp("");
      setAmount("");
      setPrice("");
      setLabel("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add dev buy", variant: "destructive" });
    },
  });

  const deleteDevBuyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/dev-buys/${id}`);
      if (!res.ok) throw new Error("Failed to delete dev buy");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dev-buys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dev-buys"] });
      toast({ title: "Dev buy removed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete dev buy", variant: "destructive" });
    },
  });

  const approveGalleryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/gallery/${id}/approve`);
      if (!res.ok) throw new Error("Failed to approve");
      return res.json();
    },
    onSuccess: () => {
      refetchPending();
      refetchGallery();
      toast({ title: "Artwork Approved" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to approve artwork", variant: "destructive" });
    },
  });

  const rejectGalleryMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const res = await apiRequest("POST", `/api/admin/gallery/${id}/reject`, { reason });
      if (!res.ok) throw new Error("Failed to reject");
      return res.json();
    },
    onSuccess: () => {
      refetchPending();
      setRejectingItemId(null);
      setRejectReason("");
      toast({ title: "Artwork Rejected", description: "The creator has been notified." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reject artwork", variant: "destructive" });
    },
  });

  const handleRejectWithReason = (id: string) => {
    rejectGalleryMutation.mutate({ id, reason: rejectReason || undefined });
  };

  const featureGalleryMutation = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const res = await apiRequest("POST", `/api/admin/gallery/${id}/feature`, { featured });
      if (!res.ok) throw new Error("Failed to feature");
      return res.json();
    },
    onSuccess: () => {
      refetchGallery();
      toast({ title: "Feature status updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update feature status", variant: "destructive" });
    },
  });

  const deleteGalleryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/gallery/${id}`);
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      refetchPending();
      refetchGallery();
      toast({ title: "Artwork Deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete artwork", variant: "destructive" });
    },
  });

  const createPollMutation = useMutation({
    mutationFn: async (data: { question: string; options: string[]; durationHours: number }) => {
      const res = await apiRequest("POST", "/api/admin/polls", data);
      if (!res.ok) throw new Error("Failed to create poll");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/polls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      refetchPolls();
      toast({ title: "Poll created!", description: "The poll is now live" });
      setPollQuestion("");
      setPollOptions(["", ""]);
      setPollDuration("24");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create poll", variant: "destructive" });
    },
  });

  const deletePollMutation = useMutation({
    mutationFn: async (id: string) => {
      setDeletingPollId(id);
      const res = await apiRequest("DELETE", `/api/admin/polls/${id}`);
      if (!res.ok) throw new Error("Failed to delete poll");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/polls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      refetchPolls();
      toast({ title: "Poll deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete poll", variant: "destructive" });
    },
    onSettled: () => {
      setDeletingPollId(null);
    },
  });

  const sendStreamNotificationMutation = useMutation({
    mutationFn: async (data: { title: string; message: string; streamUrl?: string }) => {
      const res = await apiRequest("POST", "/api/admin/stream-notification", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send notification");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Notification Sent!", 
        description: `Sent to ${data.sent} subscribers` 
      });
      setStreamMessage("");
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const handleSendStreamNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!streamTitle.trim() || !streamMessage.trim()) {
      toast({ title: "Error", description: "Title and message are required", variant: "destructive" });
      return;
    }
    sendStreamNotificationMutation.mutate({
      title: streamTitle.trim(),
      message: streamMessage.trim(),
      streamUrl: streamUrl.trim() || undefined,
    });
  };

  const adminUploadArtworkMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; imageUrl: string; tags: string[] }) => {
      const res = await apiRequest("POST", "/api/admin/gallery/upload", data);
      if (!res.ok) throw new Error("Failed to upload artwork");
      return res.json();
    },
    onSuccess: () => {
      refetchGallery();
      toast({ title: "Artwork Published", description: "The artwork has been directly published to the gallery" });
      setAdminArtTitle("");
      setAdminArtDescription("");
      setAdminArtFile(null);
      setAdminArtTags("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload artwork", variant: "destructive" });
    },
  });

  // User Management Mutations
  const banUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/ban`);
      if (!res.ok) throw new Error("Failed to ban user");
      return res.json();
    },
    onSuccess: () => {
      refetchUsers();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "User Banned", description: "User has been banned and logged out" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to ban user", variant: "destructive" });
    },
  });

  const unbanUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/unban`);
      if (!res.ok) throw new Error("Failed to unban user");
      return res.json();
    },
    onSuccess: () => {
      refetchUsers();
      toast({ title: "User Unbanned", description: "User can now log in again" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to unban user", variant: "destructive" });
    },
  });

  const changeUsernameMutation = useMutation({
    mutationFn: async ({ userId, username }: { userId: string; username: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/username`, { username });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to change username");
      }
      return res.json();
    },
    onSuccess: () => {
      refetchUsers();
      setEditingUsername(null);
      setNewUsername("");
      toast({ title: "Username Changed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const sendResetEmailMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/admin/users/${userId}/send-reset`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send reset email");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Email Sent", description: "Password reset email has been sent to the user" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const logoutAllUsersMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/logout-all");
      if (!res.ok) throw new Error("Failed to logout all users");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "All Users Logged Out", description: data.message });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to logout all users", variant: "destructive" });
    },
  });

  // Favicon Management Mutations
  const createFaviconMutation = useMutation({
    mutationFn: async (data: { name: string; fileUrl: string }) => {
      const res = await apiRequest("POST", "/api/admin/favicons", data);
      if (!res.ok) throw new Error("Failed to create favicon");
      return res.json();
    },
    onSuccess: () => {
      refetchFavicons();
      setNewFaviconName("");
      setNewFaviconFile(null);
      toast({ title: "Favicon Added", description: "The favicon is now available for users" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add favicon", variant: "destructive" });
    },
  });

  const toggleFaviconMutation = useMutation({
    mutationFn: async ({ iconId, isActive }: { iconId: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/favicons/${iconId}`, { isActive });
      if (!res.ok) throw new Error("Failed to update favicon");
      return res.json();
    },
    onSuccess: () => {
      refetchFavicons();
      toast({ title: "Favicon Updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update favicon", variant: "destructive" });
    },
  });

  const deleteFaviconMutation = useMutation({
    mutationFn: async (iconId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/favicons/${iconId}`);
      if (!res.ok) throw new Error("Failed to delete favicon");
      return res.json();
    },
    onSuccess: () => {
      refetchFavicons();
      toast({ title: "Favicon Deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete favicon", variant: "destructive" });
    },
  });

  const handleUploadFavicon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaviconName.trim()) {
      toast({ title: "Error", description: "Please enter a name for the favicon", variant: "destructive" });
      return;
    }
    if (!newFaviconFile) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }

    try {
      const response = await uploadFavicon(newFaviconFile);
      if (!response) {
        throw new Error("Failed to upload image");
      }
      createFaviconMutation.mutate({
        name: newFaviconName.trim(),
        fileUrl: response.objectPath,
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to upload favicon image", variant: "destructive" });
    }
  };

  // Filter users by search query
  const filteredUsers = allUsers.filter(u => 
    u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
    (u.walletAddress && u.walletAddress.toLowerCase().includes(userSearchQuery.toLowerCase()))
  );

  const handleAddDevBuy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!timestamp || !amount || !price) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    addDevBuyMutation.mutate({
      timestamp: new Date(timestamp).toISOString(),
      amount: parseFloat(amount),
      price: parseFloat(price),
      label: label || undefined,
    });
  };

  const handleCreatePoll = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = pollOptions.filter(opt => opt.trim() !== "");
    if (!pollQuestion.trim()) {
      toast({ title: "Error", description: "Please enter a question", variant: "destructive" });
      return;
    }
    if (validOptions.length < 2) {
      toast({ title: "Error", description: "Please add at least 2 options", variant: "destructive" });
      return;
    }
    createPollMutation.mutate({
      question: pollQuestion.trim(),
      options: validOptions,
      durationHours: parseInt(pollDuration),
    });
  };

  const addPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, ""]);
    }
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const handleAdminArtUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminArtTitle.trim()) {
      toast({ title: "Error", description: "Please enter a title", variant: "destructive" });
      return;
    }
    if (!adminArtFile) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }

    try {
      const response = await uploadFile(adminArtFile);
      if (!response) {
        throw new Error("Failed to upload image");
      }

      const tags = adminArtTags.split(",").map(t => t.trim()).filter(t => t);
      adminUploadArtworkMutation.mutate({
        title: adminArtTitle.trim(),
        description: adminArtDescription.trim(),
        imageUrl: response.objectPath,
        tags,
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to upload artwork", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user || user.role !== "admin") {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-mono flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground text-sm">Normie CEO Control Center</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 hidden md:flex flex-wrap gap-1">
            <TabsTrigger value="overview" data-testid="tab-admin-overview">
              <Activity className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-admin-users">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="gallery" data-testid="tab-admin-gallery">
              <Image className="w-4 h-4 mr-2" />
              Gallery ({pendingGallery.length} pending)
            </TabsTrigger>
            <TabsTrigger value="chart" data-testid="tab-admin-chart">
              <TrendingUp className="w-4 h-4 mr-2" />
              Chart Markers
            </TabsTrigger>
            <TabsTrigger value="polls" data-testid="tab-admin-polls">
              <BarChart3 className="w-4 h-4 mr-2" />
              Polls
            </TabsTrigger>
            <TabsTrigger value="notifications" data-testid="tab-admin-notifications">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-admin-settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">
                    {loadingStats ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      (stats?.totalUsers ?? 0).toLocaleString()
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Registered accounts</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Art</CardTitle>
                  <Image className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">{pendingGallery.length}</div>
                  <p className="text-xs text-muted-foreground">Awaiting approval</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gallery Items</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">{allGallery.length}</div>
                  <p className="text-xs text-muted-foreground">Published artwork</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Chart Markers</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">{manualDevBuys.length}</div>
                  <p className="text-xs text-muted-foreground">Dev buy markers</p>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <Button 
                  variant="outline" 
                  className="justify-start" 
                  onClick={() => setActiveTab("gallery")}
                >
                  <Image className="w-4 h-4 mr-2" />
                  Review Pending Artwork ({pendingGallery.length})
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => setActiveTab("chart")}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Add Chart Marker
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      User Management
                    </CardTitle>
                    <CardDescription>
                      Manage user accounts, ban/unban, and change usernames
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          placeholder="Search users by name, email, or wallet..."
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          className="flex-1"
                          data-testid="input-search-users"
                        />
                        <Button
                          variant="destructive"
                          onClick={() => {
                            if (confirm("This will log out all users immediately. Continue?")) {
                              logoutAllUsersMutation.mutate();
                            }
                          }}
                          disabled={logoutAllUsersMutation.isPending}
                          data-testid="button-logout-all"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          {logoutAllUsersMutation.isPending ? "Logging out..." : "Logout All Users"}
                        </Button>
                      </div>

                      <div className="border rounded-md divide-y max-h-[500px] overflow-y-auto">
                        {filteredUsers.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground">
                            {userSearchQuery ? "No users found matching your search" : "No users yet"}
                          </div>
                        ) : (
                          filteredUsers.map((u) => (
                            <div
                              key={u.id}
                              className={`p-3 flex items-center justify-between gap-2 hover-elevate cursor-pointer ${selectedUserId === u.id ? "bg-accent" : ""}`}
                              onClick={() => setSelectedUserId(selectedUserId === u.id ? null : u.id)}
                              data-testid={`user-row-${u.id}`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                  {u.avatarUrl ? (
                                    <img src={normalizeStorageUrl(u.avatarUrl)} alt="" className="w-8 h-8 rounded-full object-cover" />
                                  ) : (
                                    <Users className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium truncate">{u.username}</span>
                                    {u.role === "admin" && <Badge variant="secondary" className="text-xs">Admin</Badge>}
                                    {u.bannedAt && <Badge variant="destructive" className="text-xs">Banned</Badge>}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {u.email || u.walletAddress?.slice(0, 8) + "..." || "No contact"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="text-xs text-muted-foreground">{u.messageCount} msgs, {u.galleryCount} art</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">User Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!selectedUserId ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Select a user to view details and take actions
                      </p>
                    ) : loadingUserDetails ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : userDetails ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Username</Label>
                          {editingUsername === userDetails.user.id ? (
                            <div className="flex gap-2">
                              <Input
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                placeholder="New username"
                                data-testid="input-new-username"
                              />
                              <Button
                                size="sm"
                                onClick={() => changeUsernameMutation.mutate({ userId: userDetails.user.id, username: newUsername })}
                                disabled={changeUsernameMutation.isPending || !newUsername.trim()}
                                data-testid="button-save-username"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setEditingUsername(null); setNewUsername(""); }}
                                data-testid="button-cancel-username"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">{userDetails.user.username}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setEditingUsername(userDetails.user.id); setNewUsername(userDetails.user.username); }}
                                data-testid="button-edit-username"
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Email</Label>
                          <p className="text-sm">{userDetails.user.email || "Not set"}</p>
                        </div>

                        <div className="space-y-2">
                          <Label>Wallet</Label>
                          <p className="text-sm font-mono text-xs truncate">{userDetails.user.walletAddress || "Not connected"}</p>
                        </div>

                        <div className="space-y-2">
                          <Label>Joined</Label>
                          <p className="text-sm">{userDetails.user.createdAt ? new Date(userDetails.user.createdAt).toLocaleDateString() : "Unknown"}</p>
                        </div>

                        <div className="pt-4 border-t space-y-2">
                          <Label>Actions</Label>
                          <div className="flex flex-col gap-2">
                            {userDetails.user.email && (
                              <Button
                                variant="outline"
                                className="justify-start"
                                onClick={() => sendResetEmailMutation.mutate(userDetails.user.id)}
                                disabled={sendResetEmailMutation.isPending}
                                data-testid="button-send-reset"
                              >
                                <Mail className="w-4 h-4 mr-2" />
                                {sendResetEmailMutation.isPending ? "Sending..." : "Send Password Reset"}
                              </Button>
                            )}
                            {userDetails.user.bannedAt ? (
                              <Button
                                variant="outline"
                                className="justify-start"
                                onClick={() => unbanUserMutation.mutate(userDetails.user.id)}
                                disabled={unbanUserMutation.isPending}
                                data-testid="button-unban-user"
                              >
                                <Check className="w-4 h-4 mr-2" />
                                {unbanUserMutation.isPending ? "Unbanning..." : "Unban User"}
                              </Button>
                            ) : userDetails.user.role !== "admin" ? (
                              <Button
                                variant="destructive"
                                className="justify-start"
                                onClick={() => {
                                  if (confirm(`Ban user ${userDetails.user.username}? They will be logged out immediately.`)) {
                                    banUserMutation.mutate(userDetails.user.id);
                                  }
                                }}
                                disabled={banUserMutation.isPending}
                                data-testid="button-ban-user"
                              >
                                <Ban className="w-4 h-4 mr-2" />
                                {banUserMutation.isPending ? "Banning..." : "Ban User"}
                              </Button>
                            ) : null}
                          </div>
                        </div>

                        {userDetails.messages.length > 0 && (
                          <div className="pt-4 border-t space-y-2">
                            <Label>Recent Messages ({userDetails.messages.length})</Label>
                            <div className="max-h-40 overflow-y-auto space-y-2">
                              {userDetails.messages.slice(0, 10).map((msg) => (
                                <div key={msg.id} className="text-xs p-2 bg-muted rounded">
                                  <p className="truncate">{msg.content}</p>
                                  <p className="text-muted-foreground">{new Date(msg.createdAt).toLocaleString()}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {userDetails.gallery.length > 0 && (
                          <div className="pt-4 border-t space-y-2">
                            <Label>Gallery Items ({userDetails.gallery.length})</Label>
                            <div className="grid grid-cols-2 gap-2">
                              {userDetails.gallery.slice(0, 4).map((item) => (
                                <div key={item.id} className="aspect-square rounded overflow-hidden">
                                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="gallery">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  Gallery Moderation
                </CardTitle>
                <CardDescription>
                  Review and approve community artwork submissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      Pending Approval ({pendingGallery.length})
                    </h3>
                    {loadingPending ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : pendingGallery.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No pending artwork to review
                      </p>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {pendingGallery.map((item) => (
                          <Card key={item.id} className="overflow-hidden" data-testid={`pending-gallery-${item.id}`}>
                            <div className="aspect-video relative bg-muted">
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <CardContent className="p-3">
                              <h4 className="font-mono font-semibold truncate">{item.title}</h4>
                              <p className="text-xs text-muted-foreground truncate">
                                by {item.creatorName || "Anonymous"}
                              </p>
                              {item.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {item.description}
                                </p>
                              )}
                              <div className="flex gap-2 mt-3">
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => approveGalleryMutation.mutate(item.id)}
                                  disabled={approveGalleryMutation.isPending}
                                  data-testid={`button-approve-${item.id}`}
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="flex-1"
                                  onClick={() => {
                                    setRejectingItemId(item.id);
                                    setRejectReason("");
                                  }}
                                  disabled={rejectGalleryMutation.isPending}
                                  data-testid={`button-reject-${item.id}`}
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Reject
                                </Button>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-full mt-2 text-destructive"
                                onClick={() => {
                                  if (confirm("Permanently delete this artwork?")) {
                                    deleteGalleryMutation.mutate(item.id);
                                  }
                                }}
                                disabled={deleteGalleryMutation.isPending}
                                data-testid={`button-delete-pending-${item.id}`}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Delete
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Direct Upload (Skip Approval)
                    </h3>
                    <form onSubmit={handleAdminArtUpload} className="space-y-4 mb-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="admin-art-title">Title *</Label>
                          <Input
                            id="admin-art-title"
                            placeholder="Artwork title"
                            value={adminArtTitle}
                            onChange={(e) => setAdminArtTitle(e.target.value)}
                            data-testid="input-admin-art-title"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="admin-art-tags">Tags (comma separated)</Label>
                          <Input
                            id="admin-art-tags"
                            placeholder="art, meme, normie"
                            value={adminArtTags}
                            onChange={(e) => setAdminArtTags(e.target.value)}
                            data-testid="input-admin-art-tags"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-art-description">Description</Label>
                        <Input
                          id="admin-art-description"
                          placeholder="Optional description"
                          value={adminArtDescription}
                          onChange={(e) => setAdminArtDescription(e.target.value)}
                          data-testid="input-admin-art-description"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-art-file">Image File (JPEG/PNG, max 5MB) *</Label>
                        <Input
                          id="admin-art-file"
                          type="file"
                          accept="image/jpeg,image/png"
                          onChange={(e) => setAdminArtFile(e.target.files?.[0] || null)}
                          data-testid="input-admin-art-file"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        disabled={isUploadingAdminArt || adminUploadArtworkMutation.isPending}
                        data-testid="button-admin-upload-art"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {isUploadingAdminArt || adminUploadArtworkMutation.isPending ? "Uploading..." : "Upload & Publish"}
                      </Button>
                    </form>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-4">Published Artwork ({allGallery.length})</h3>
                    {allGallery.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        No published artwork yet
                      </p>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {allGallery.map((item) => (
                          <Card key={item.id} className="overflow-hidden" data-testid={`gallery-${item.id}`}>
                            <div className="aspect-square relative bg-muted">
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                              {item.featured && (
                                <Badge className="absolute top-2 right-2 bg-yellow-500">
                                  <Star className="w-3 h-3" />
                                </Badge>
                              )}
                            </div>
                            <CardContent className="p-2">
                              <h4 className="font-mono text-sm truncate">{item.title}</h4>
                              <div className="flex items-center justify-between mt-2 gap-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Eye className="w-3 h-3" />
                                    {item.views || 0}
                                  </span>
                                  <span className="text-green-400">+{item.upvotes || 0}</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant={item.featured ? "default" : "outline"}
                                  className="h-7 text-xs"
                                  onClick={() => featureGalleryMutation.mutate({ id: item.id, featured: !item.featured })}
                                  data-testid={`button-feature-${item.id}`}
                                >
                                  <Star className="w-3 h-3 mr-1" />
                                  {item.featured ? "Featured" : "Feature"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-destructive"
                                  onClick={() => {
                                    if (confirm("Permanently delete this artwork?")) {
                                      deleteGalleryMutation.mutate(item.id);
                                    }
                                  }}
                                  disabled={deleteGalleryMutation.isPending}
                                  data-testid={`button-delete-approved-${item.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chart">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Dev Buy Chart Markers
                </CardTitle>
                <CardDescription>
                  Manually add dev buy markers to display on the price chart
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddDevBuy} className="space-y-4 mb-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="timestamp">Date/Time *</Label>
                      <Input
                        id="timestamp"
                        type="datetime-local"
                        value={timestamp}
                        onChange={(e) => setTimestamp(e.target.value)}
                        data-testid="input-dev-buy-timestamp"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (tokens) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.000001"
                        placeholder="100000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        data-testid="input-dev-buy-amount"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Price (USD) *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.0000000001"
                        placeholder="0.0004"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        data-testid="input-dev-buy-price"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="label">Label (optional)</Label>
                      <Input
                        id="label"
                        type="text"
                        placeholder="Dev buy #1"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        data-testid="input-dev-buy-label"
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={addDevBuyMutation.isPending}
                    data-testid="button-add-dev-buy"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {addDevBuyMutation.isPending ? "Adding..." : "Add Dev Buy Marker"}
                  </Button>
                </form>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Existing Manual Dev Buys
                  </h4>
                  {loadingBuys ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : manualDevBuys.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      No manual dev buys added yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {manualDevBuys.map((buy) => (
                        <div
                          key={buy.id}
                          className="flex items-center justify-between p-3 border rounded-md"
                          data-testid={`dev-buy-${buy.id}`}
                        >
                          <div className="flex-1 flex flex-wrap items-center gap-4">
                            <div>
                              <span className="text-sm font-medium">
                                {new Date(buy.timestamp).toLocaleString()}
                              </span>
                              {buy.label && (
                                <Badge variant="outline" className="ml-2">{buy.label}</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {parseFloat(buy.amount).toLocaleString()} tokens @ ${parseFloat(buy.price).toFixed(8)}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteDevBuyMutation.mutate(buy.id)}
                            disabled={deleteDevBuyMutation.isPending}
                            data-testid={`button-delete-dev-buy-${buy.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="polls">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Community Polls
                </CardTitle>
                <CardDescription>
                  Create and manage community polls that appear in the Community Hub
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreatePoll} className="space-y-4 mb-6">
                  <div className="space-y-2">
                    <Label htmlFor="poll-question">Poll Question *</Label>
                    <Input
                      id="poll-question"
                      placeholder="What should we build next?"
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      data-testid="input-poll-question"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Options (min 2, max 6)</Label>
                    {pollOptions.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder={`Option ${index + 1}`}
                          value={option}
                          onChange={(e) => updatePollOption(index, e.target.value)}
                          data-testid={`input-poll-option-${index}`}
                        />
                        {pollOptions.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removePollOption(index)}
                            data-testid={`button-remove-option-${index}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {pollOptions.length < 6 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addPollOption}
                        data-testid="button-add-option"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Option
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="poll-duration">Duration</Label>
                    <select
                      id="poll-duration"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                      value={pollDuration}
                      onChange={(e) => setPollDuration(e.target.value)}
                      data-testid="select-poll-duration"
                    >
                      <option value="1">1 hour</option>
                      <option value="6">6 hours</option>
                      <option value="12">12 hours</option>
                      <option value="24">24 hours</option>
                      <option value="48">2 days</option>
                      <option value="168">1 week</option>
                    </select>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={createPollMutation.isPending}
                    data-testid="button-create-poll"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {createPollMutation.isPending ? "Creating..." : "Create Poll"}
                  </Button>
                </form>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    All Polls ({polls.length})
                  </h4>
                  {polls.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      No polls yet. Create one above!
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {polls.map((poll) => (
                        <div
                          key={poll.id}
                          className="p-4 border rounded-md"
                          data-testid={`poll-${poll.id}`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <h5 className="font-medium flex-1">{poll.question}</h5>
                            <div className="flex items-center gap-2">
                              <Badge variant={poll.isActive ? "default" : "secondary"}>
                                {poll.isActive ? "Live" : "Ended"}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deletePollMutation.mutate(poll.id)}
                                disabled={deletingPollId === poll.id}
                                data-testid={`button-delete-poll-${poll.id}`}
                              >
                                {deletingPollId === poll.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {poll.options.map((option) => (
                              <div key={option.id} className="flex items-center justify-between text-sm">
                                <span>{option.text}</span>
                                <span className="text-muted-foreground">{option.votes} votes</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 text-xs text-muted-foreground">
                            Total: {poll.totalVotes} votes
                            {poll.endsAt && (
                              <span className="ml-2">
                                Ends: {new Date(poll.endsAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Stream Notifications
                </CardTitle>
                <CardDescription>
                  Send push notifications to users about PumpFun streams
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendStreamNotification} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="stream-title">Notification Title</Label>
                    <Input
                      id="stream-title"
                      value={streamTitle}
                      onChange={(e) => setStreamTitle(e.target.value)}
                      placeholder="Normie Nation Stream Alert"
                      maxLength={100}
                      data-testid="input-stream-title"
                    />
                    <p className="text-xs text-muted-foreground">{streamTitle.length}/100 characters</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stream-message">Message</Label>
                    <Textarea
                      id="stream-message"
                      value={streamMessage}
                      onChange={(e) => setStreamMessage(e.target.value)}
                      placeholder="Join us for a live stream on PumpFun!"
                      className="resize-none"
                      rows={3}
                      maxLength={500}
                      data-testid="input-stream-message"
                    />
                    <p className="text-xs text-muted-foreground">{streamMessage.length}/500 characters</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stream-url">Stream URL (optional)</Label>
                    <Input
                      id="stream-url"
                      value={streamUrl}
                      onChange={(e) => setStreamUrl(e.target.value)}
                      placeholder="https://pump.fun/coin/..."
                      data-testid="input-stream-url"
                    />
                    <p className="text-xs text-muted-foreground">
                      Clicking the notification will open this link. Defaults to $NORMIE on PumpFun.
                    </p>
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <Button 
                      type="submit" 
                      disabled={sendStreamNotificationMutation.isPending || !streamTitle.trim() || !streamMessage.trim()}
                      data-testid="button-send-stream-notification"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sendStreamNotificationMutation.isPending ? "Sending..." : "Send Notification"}
                    </Button>
                    
                    <a
                      href={streamUrl || "https://pump.fun/coin/FrSFwE2BxWADEyUWFXDMAeomzuB4r83ZvzdG9sevpump"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground flex items-center gap-1"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Preview Link
                    </a>
                  </div>
                </form>

                <div className="mt-6 pt-4 border-t">
                  <h4 className="font-medium mb-2">How it works</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Notifications are sent to all users who enabled "Announcements" in their notification preferences</li>
                    <li>Users must have push notifications enabled in their browser</li>
                    <li>Clicking the notification opens the stream URL directly</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Custom Icons/Favicons
                  </CardTitle>
                  <CardDescription>
                    Upload custom icons that users can select for their browser tab favicon
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUploadFavicon} className="space-y-4 mb-6">
                    <div className="space-y-2">
                      <Label htmlFor="favicon-name">Icon Name *</Label>
                      <Input
                        id="favicon-name"
                        placeholder="e.g., Normie Beanie, Classic Logo"
                        value={newFaviconName}
                        onChange={(e) => setNewFaviconName(e.target.value)}
                        data-testid="input-favicon-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="favicon-file">Image File *</Label>
                      <Input
                        id="favicon-file"
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                        onChange={(e) => setNewFaviconFile(e.target.files?.[0] || null)}
                        data-testid="input-favicon-file"
                      />
                      <p className="text-xs text-muted-foreground">
                        Supported formats: PNG, JPG, JPEG, SVG. Recommended size: 32x32 or 64x64 pixels.
                      </p>
                    </div>
                    <Button
                      type="submit"
                      disabled={isUploadingFavicon || createFaviconMutation.isPending || !newFaviconName.trim() || !newFaviconFile}
                      data-testid="button-upload-favicon"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {isUploadingFavicon || createFaviconMutation.isPending ? "Uploading..." : "Upload Favicon"}
                    </Button>
                  </form>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Available Favicons ({favicons.length})
                    </h4>
                    {favicons.length === 0 ? (
                      <p className="text-muted-foreground text-sm text-center py-4">
                        No favicons uploaded yet. Upload one above!
                      </p>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {favicons.map((favicon) => (
                          <div
                            key={favicon.id}
                            className="p-4 border rounded-md flex items-center justify-between gap-3"
                            data-testid={`favicon-${favicon.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={favicon.fileUrl}
                                alt={favicon.name}
                                className="w-8 h-8 object-contain"
                              />
                              <div>
                                <p className="font-medium text-sm">{favicon.name}</p>
                                <Badge variant={favicon.isActive ? "default" : "secondary"} className="text-xs">
                                  {favicon.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => toggleFaviconMutation.mutate({ iconId: favicon.id, isActive: !favicon.isActive })}
                                disabled={toggleFaviconMutation.isPending}
                                data-testid={`button-toggle-favicon-${favicon.id}`}
                              >
                                {favicon.isActive ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm(`Delete favicon "${favicon.name}"?`)) {
                                    deleteFaviconMutation.mutate(favicon.id);
                                  }
                                }}
                                disabled={deleteFaviconMutation.isPending}
                                data-testid={`button-delete-favicon-${favicon.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Other Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2 p-4 border rounded-md">
                      <div>
                        <h3 className="font-medium">User Management</h3>
                        <p className="text-sm text-muted-foreground">View, edit, and moderate user accounts</p>
                      </div>
                      <Button variant="outline" onClick={() => setActiveTab("users")}>
                        Go to Users
                      </Button>
                    </div>
                    <div className="flex items-center justify-between gap-2 p-4 border rounded-md">
                      <div>
                        <h3 className="font-medium">Chat Moderation</h3>
                        <p className="text-sm text-muted-foreground">Monitor and moderate community chat</p>
                      </div>
                      <Badge variant="secondary">Coming Soon</Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2 p-4 border rounded-md">
                      <div>
                        <h3 className="font-medium">NFT Marketplace</h3>
                        <p className="text-sm text-muted-foreground">Manage NFT listings and transactions</p>
                      </div>
                      <Badge variant="secondary">Coming Soon</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Spacer for mobile navbar */}
        <div className="h-20 md:hidden" />
      </div>
      
      <AdminMobileNavbar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        pendingCount={pendingGallery.length}
      />

      <Dialog open={!!rejectingItemId} onOpenChange={(open) => !open && setRejectingItemId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Artwork</DialogTitle>
            <DialogDescription>
              Optionally provide a reason for rejection. This will be sent to the creator.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason (optional)</Label>
              <Textarea
                id="reject-reason"
                placeholder="e.g., Image quality too low, Inappropriate content, etc."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="min-h-[100px]"
                data-testid="input-reject-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectingItemId(null)}
              data-testid="button-cancel-reject"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectingItemId && handleRejectWithReason(rejectingItemId)}
              disabled={rejectGalleryMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectGalleryMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Reject Artwork
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}