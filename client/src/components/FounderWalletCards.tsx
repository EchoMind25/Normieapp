import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wallet, Plus, Trash2, Edit3, Eye, EyeOff, ExternalLink, Crown } from "lucide-react";

interface FounderWallet {
  id: string;
  userId: string;
  walletAddress: string;
  walletName: string;
  walletType: string;
  showOnLeaderboard: boolean;
  isActive: boolean;
  createdAt: string;
}

interface FounderWalletCardsProps {
  userWalletAddress?: string | null;
}

const WALLET_TYPES = [
  { value: "giveaway", label: "Giveaway" },
  { value: "dev", label: "Dev Operations" },
  { value: "personal", label: "Personal" },
  { value: "treasury", label: "Treasury" },
  { value: "other", label: "Other" },
];

export function FounderWalletCards({ userWalletAddress }: FounderWalletCardsProps) {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingWallet, setEditingWallet] = useState<FounderWallet | null>(null);
  
  const [newWalletAddress, setNewWalletAddress] = useState("");
  const [newWalletName, setNewWalletName] = useState("");
  const [newWalletType, setNewWalletType] = useState("personal");
  const [newShowOnLeaderboard, setNewShowOnLeaderboard] = useState(false);

  const { data: founderWallets = [], isLoading } = useQuery<FounderWallet[]>({
    queryKey: ["/api/auth/founder/wallets"],
  });

  const addWalletMutation = useMutation({
    mutationFn: async (data: { walletAddress: string; walletName: string; walletType: string; showOnLeaderboard: boolean }) => {
      const res = await apiRequest("POST", "/api/auth/founder/wallets", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/founder/wallets"] });
      toast({ title: "Wallet added", description: "Founder wallet added successfully" });
      resetForm();
      setShowAddDialog(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to add wallet", description: error.message, variant: "destructive" });
    },
  });

  const updateWalletMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FounderWallet> }) => {
      const res = await apiRequest("PATCH", `/api/auth/founder/wallets/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/founder/wallets"] });
      toast({ title: "Wallet updated", description: "Founder wallet updated successfully" });
      setEditingWallet(null);
    },
    onError: (error: any) => {
      toast({ title: "Failed to update wallet", description: error.message, variant: "destructive" });
    },
  });

  const deleteWalletMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/auth/founder/wallets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/founder/wallets"] });
      toast({ title: "Wallet removed", description: "Founder wallet removed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to remove wallet", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setNewWalletAddress("");
    setNewWalletName("");
    setNewWalletType("personal");
    setNewShowOnLeaderboard(false);
  };

  const handleAddWallet = () => {
    if (!newWalletAddress || !newWalletName) {
      toast({ title: "Missing fields", description: "Please provide wallet address and name", variant: "destructive" });
      return;
    }
    addWalletMutation.mutate({
      walletAddress: newWalletAddress,
      walletName: newWalletName,
      walletType: newWalletType,
      showOnLeaderboard: newShowOnLeaderboard,
    });
  };

  const getWalletTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      giveaway: "bg-chart-2/20 text-chart-2",
      dev: "bg-chart-1/20 text-chart-1",
      personal: "bg-chart-3/20 text-chart-3",
      treasury: "bg-chart-4/20 text-chart-4",
      other: "bg-muted text-muted-foreground",
    };
    return colors[type] || colors.other;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2 font-mono text-base">
              <Crown className="h-4 w-4 text-yellow-500" />
              Founder Wallets
            </CardTitle>
            <CardDescription className="text-xs">
              Manage wallets for giveaways, dev ops, and personal holdings
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowAddDialog(true)} data-testid="button-add-founder-wallet">
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {founderWallets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No founder wallets configured. Add wallets to manage giveaways and track holdings.
            </p>
          ) : (
            founderWallets.map((wallet) => (
              <div
                key={wallet.id}
                className="flex items-center justify-between gap-2 p-3 border rounded-md"
                data-testid={`founder-wallet-${wallet.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-medium text-sm truncate">{wallet.walletName}</span>
                    <Badge size="sm" className={getWalletTypeBadge(wallet.walletType)}>
                      {wallet.walletType}
                    </Badge>
                    {wallet.showOnLeaderboard ? (
                      <Eye className="h-3 w-3 text-muted-foreground" title="Visible on leaderboard" />
                    ) : (
                      <EyeOff className="h-3 w-3 text-muted-foreground" title="Hidden from leaderboard" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs text-muted-foreground">
                      {wallet.walletAddress.slice(0, 6)}...{wallet.walletAddress.slice(-4)}
                    </span>
                    <a
                      href={`https://solscan.io/account/${wallet.walletAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditingWallet(wallet)}
                    data-testid={`button-edit-wallet-${wallet.id}`}
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteWalletMutation.mutate(wallet.id)}
                    disabled={deleteWalletMutation.isPending}
                    data-testid={`button-delete-wallet-${wallet.id}`}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Founder Wallet</DialogTitle>
            <DialogDescription>
              Add a wallet address to manage for giveaways, dev operations, or personal holdings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Wallet Address</Label>
              <Input
                placeholder="Enter Solana wallet address"
                value={newWalletAddress}
                onChange={(e) => setNewWalletAddress(e.target.value)}
                className="font-mono"
                data-testid="input-founder-wallet-address"
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="e.g., Main Giveaway Wallet"
                value={newWalletName}
                onChange={(e) => setNewWalletName(e.target.value)}
                data-testid="input-founder-wallet-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newWalletType} onValueChange={setNewWalletType}>
                <SelectTrigger data-testid="select-founder-wallet-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WALLET_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show on Leaderboard</Label>
                <p className="text-xs text-muted-foreground">
                  If enabled, this wallet will appear in public leaderboards
                </p>
              </div>
              <Switch
                checked={newShowOnLeaderboard}
                onCheckedChange={setNewShowOnLeaderboard}
                data-testid="switch-founder-wallet-leaderboard"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowAddDialog(false); }}>
              Cancel
            </Button>
            <Button onClick={handleAddWallet} disabled={addWalletMutation.isPending}>
              {addWalletMutation.isPending ? "Adding..." : "Add Wallet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingWallet} onOpenChange={(open) => !open && setEditingWallet(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Founder Wallet</DialogTitle>
            <DialogDescription>
              Update wallet settings. Changes take effect immediately.
            </DialogDescription>
          </DialogHeader>
          {editingWallet && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Wallet Address</Label>
                <Input
                  value={editingWallet.walletAddress}
                  disabled
                  className="font-mono bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editingWallet.walletName}
                  onChange={(e) => setEditingWallet({ ...editingWallet, walletName: e.target.value })}
                  data-testid="input-edit-wallet-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={editingWallet.walletType}
                  onValueChange={(value) => setEditingWallet({ ...editingWallet, walletType: value })}
                >
                  <SelectTrigger data-testid="select-edit-wallet-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WALLET_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show on Leaderboard</Label>
                  <p className="text-xs text-muted-foreground">
                    If enabled, this wallet will appear in public leaderboards
                  </p>
                </div>
                <Switch
                  checked={editingWallet.showOnLeaderboard}
                  onCheckedChange={(checked) => setEditingWallet({ ...editingWallet, showOnLeaderboard: checked })}
                  data-testid="switch-edit-wallet-leaderboard"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingWallet(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingWallet) {
                  updateWalletMutation.mutate({
                    id: editingWallet.id,
                    data: {
                      walletName: editingWallet.walletName,
                      walletType: editingWallet.walletType,
                      showOnLeaderboard: editingWallet.showOnLeaderboard,
                    },
                  });
                }
              }}
              disabled={updateWalletMutation.isPending}
            >
              {updateWalletMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
