import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Users, Shield, Activity, Settings, Plus, Trash2, TrendingUp, Calendar,
  Image, Check, X, Star, Eye, MessageSquare, Loader2
} from "lucide-react";
import type { GalleryItem } from "@shared/schema";

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
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/gallery/${id}/reject`);
      if (!res.ok) throw new Error("Failed to reject");
      return res.json();
    },
    onSuccess: () => {
      refetchPending();
      toast({ title: "Artwork Rejected" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reject artwork", variant: "destructive" });
    },
  });

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
          <TabsList className="mb-6">
            <TabsTrigger value="overview" data-testid="tab-admin-overview">
              <Activity className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="gallery" data-testid="tab-admin-gallery">
              <Image className="w-4 h-4 mr-2" />
              Gallery ({pendingGallery.length} pending)
            </TabsTrigger>
            <TabsTrigger value="chart" data-testid="tab-admin-chart">
              <TrendingUp className="w-4 h-4 mr-2" />
              Chart Markers
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
                  <div className="text-2xl font-bold font-mono">--</div>
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
                                  onClick={() => rejectGalleryMutation.mutate(item.id)}
                                  disabled={rejectGalleryMutation.isPending}
                                  data-testid={`button-reject-${item.id}`}
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
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

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Platform Settings
                </CardTitle>
                <CardDescription>
                  Configure platform features and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-md">
                    <div>
                      <h3 className="font-medium">User Management</h3>
                      <p className="text-sm text-muted-foreground">View, edit, and moderate user accounts</p>
                    </div>
                    <Badge variant="secondary">Coming Soon</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-md">
                    <div>
                      <h3 className="font-medium">Chat Moderation</h3>
                      <p className="text-sm text-muted-foreground">Monitor and moderate community chat</p>
                    </div>
                    <Badge variant="secondary">Coming Soon</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-md">
                    <div>
                      <h3 className="font-medium">Custom Icons/Favicons</h3>
                      <p className="text-sm text-muted-foreground">Customize app icons and branding</p>
                    </div>
                    <Badge variant="secondary">Coming Soon</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-md">
                    <div>
                      <h3 className="font-medium">NFT Marketplace</h3>
                      <p className="text-sm text-muted-foreground">Manage NFT listings and transactions</p>
                    </div>
                    <Badge variant="secondary">Coming Soon</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}