import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Grid3X3, 
  Tag, 
  Package, 
  Clock,
  X,
  Edit,
  ExternalLink,
  Wallet
} from "lucide-react";
import type { Nft, NftListing, NftOffer } from "@shared/schema";

interface MarketplaceConfig {
  feePercentage: number;
  minListingPrice: number;
  isOpen?: boolean;
}

function AccessCheck({ 
  isLoading, 
  isAuthenticated, 
  isAdmin, 
  marketplaceOpen 
}: { 
  isLoading: boolean; 
  isAuthenticated: boolean; 
  isAdmin: boolean;
  marketplaceOpen: boolean;
}) {
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center font-mono">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // Allow access if marketplace is open to all, or user is admin/founder
  if (!isAuthenticated || (!marketplaceOpen && !isAdmin)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 border-destructive/50">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-mono font-bold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground font-mono text-sm mb-4">
              The NFT Marketplace is currently in beta and only available to administrators.
            </p>
            <Link href="/">
              <Button variant="outline" className="font-mono" data-testid="button-back-home">
                Return to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

function OwnedNftCard({ 
  nft, 
  onList 
}: { 
  nft: Nft; 
  onList: (nft: Nft) => void;
}) {
  return (
    <Card className="group overflow-visible hover-elevate border-border/50 bg-card/80" data-testid={`card-owned-nft-${nft.id}`}>
      <div className="relative aspect-square overflow-hidden rounded-t-md">
        {nft.imageUrl ? (
          <img 
            src={nft.imageUrl} 
            alt={nft.name || "NFT"} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Grid3X3 className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
      </div>
      <CardContent className="p-3">
        <h3 className="font-mono font-semibold text-sm truncate">{nft.name || "Unnamed NFT"}</h3>
        {nft.rarityRank && (
          <p className="text-xs text-muted-foreground font-mono">Rank #{nft.rarityRank}</p>
        )}
      </CardContent>
      <CardFooter className="p-3 pt-0">
        <Button 
          size="sm" 
          className="w-full"
          onClick={() => onList(nft)}
          data-testid={`button-list-${nft.id}`}
        >
          <Tag className="w-4 h-4 mr-2" />
          List for Sale
        </Button>
      </CardFooter>
    </Card>
  );
}

function ListingCard({ 
  listing, 
  onCancel, 
  onEdit 
}: { 
  listing: NftListing; 
  onCancel: (id: string) => void;
  onEdit: (listing: NftListing) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  const { data: nft } = useQuery<{ nft: Nft }>({
    queryKey: ["/api/nfts", listing.nftId],
  });

  const statusColors: Record<string, string> = {
    active: "bg-green-500/20 text-green-500",
    sold: "bg-blue-500/20 text-blue-500",
    cancelled: "bg-gray-500/20 text-gray-500",
    expired: "bg-orange-500/20 text-orange-500",
  };

  return (
    <Card className="overflow-visible hover-elevate" data-testid={`card-listing-${listing.id}`}>
      <div className="flex gap-4 p-4">
        <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0">
          {nft?.nft.imageUrl ? (
            <img 
              src={nft.nft.imageUrl} 
              alt={nft.nft.name || "NFT"} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Grid3X3 className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-mono font-semibold truncate">{nft?.nft.name || "Loading..."}</h3>
              <Badge className={`${statusColors[listing.status || "active"]} font-mono text-xs uppercase mt-1`}>
                {listing.status}
              </Badge>
            </div>
            <div className="text-right">
              <p className="font-mono font-bold">{parseFloat(listing.priceSol).toFixed(2)} SOL</p>
              {listing.listedAt && (
                <p className="text-xs text-muted-foreground">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {new Date(listing.listedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          {listing.status === "active" && (
            <div className="flex gap-2 mt-3">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onEdit(listing)}
                data-testid={`button-edit-${listing.id}`}
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => onCancel(listing.id)}
                data-testid={`button-cancel-${listing.id}`}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function OfferCard({ 
  offer,
  type,
  onRespond 
}: { 
  offer: NftOffer;
  type: "received" | "made";
  onRespond?: (id: string, action: "accept" | "reject") => void;
}) {
  const { data: nft } = useQuery<{ nft: Nft }>({
    queryKey: ["/api/nfts", offer.nftId],
  });

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-500",
    accepted: "bg-green-500/20 text-green-500",
    rejected: "bg-red-500/20 text-red-500",
    expired: "bg-gray-500/20 text-gray-500",
  };

  return (
    <Card className="overflow-visible" data-testid={`card-offer-${offer.id}`}>
      <div className="flex gap-4 p-4">
        <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
          {nft?.nft.imageUrl ? (
            <img src={nft.nft.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-muted" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-mono font-semibold text-sm truncate">{nft?.nft.name || "Loading..."}</h3>
              <Badge className={`${statusColors[offer.status || "pending"]} font-mono text-xs uppercase mt-1`}>
                {offer.status}
              </Badge>
            </div>
            <div className="text-right">
              <p className="font-mono font-bold">{parseFloat(offer.offerAmountSol).toFixed(2)} SOL</p>
              <p className="text-xs text-muted-foreground">
                {new Date(offer.createdAt || Date.now()).toLocaleDateString()}
              </p>
            </div>
          </div>
          {type === "received" && offer.status === "pending" && onRespond && (
            <div className="flex gap-2 mt-2">
              <Button 
                size="sm" 
                onClick={() => onRespond(offer.id, "accept")}
                data-testid={`button-accept-${offer.id}`}
              >
                Accept
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => onRespond(offer.id, "reject")}
                data-testid={`button-reject-${offer.id}`}
              >
                Reject
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function MyNfts() {
  const { user, isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [showListModal, setShowListModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedNft, setSelectedNft] = useState<Nft | null>(null);
  const [selectedListing, setSelectedListing] = useState<NftListing | null>(null);
  const [listPrice, setListPrice] = useState("");

  // Fetch marketplace config first to check if marketplace is open
  const { data: config, isLoading: configLoading } = useQuery<MarketplaceConfig>({
    queryKey: ["/api/marketplace/config"],
  });

  // Access check - allow if marketplace is open to all OR user is admin/founder
  const accessCheck = AccessCheck({ 
    isLoading: authLoading || configLoading, 
    isAuthenticated, 
    isAdmin, 
    marketplaceOpen: config?.isOpen ?? false 
  });
  if (accessCheck) return accessCheck;

  const { data: ownedNfts, isLoading: nftsLoading } = useQuery<Nft[]>({
    queryKey: ["/api/user", user?.id, "nfts"],
    enabled: !!user?.id,
  });

  const { data: myListings, isLoading: listingsLoading } = useQuery<NftListing[]>({
    queryKey: ["/api/marketplace/my-listings"],
    enabled: isAuthenticated,
  });

  const { data: myOffers, isLoading: offersLoading } = useQuery<NftOffer[]>({
    queryKey: ["/api/marketplace/my-offers"],
    enabled: isAuthenticated,
  });

  const createListingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedNft) return;
      await apiRequest("POST", "/api/marketplace/listings", {
        nftId: selectedNft.id,
        priceSol: listPrice,
      });
    },
    onSuccess: () => {
      setShowListModal(false);
      setSelectedNft(null);
      setListPrice("");
      toast({ title: "NFT listed successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/my-listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user", user?.id, "nfts"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to list NFT", description: error.message, variant: "destructive" });
    },
  });

  const updateListingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedListing) return;
      await apiRequest("PATCH", `/api/marketplace/listings/${selectedListing.id}`, {
        priceSol: listPrice,
      });
    },
    onSuccess: () => {
      setShowEditModal(false);
      setSelectedListing(null);
      setListPrice("");
      toast({ title: "Listing updated!" });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/my-listings"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update listing", description: error.message, variant: "destructive" });
    },
  });

  const cancelListingMutation = useMutation({
    mutationFn: async (listingId: string) => {
      await apiRequest("POST", `/api/marketplace/listings/${listingId}/cancel`);
    },
    onSuccess: () => {
      toast({ title: "Listing cancelled" });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/my-listings"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to cancel listing", description: error.message, variant: "destructive" });
    },
  });

  const respondOfferMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "accept" | "reject" }) => {
      await apiRequest("POST", `/api/marketplace/offers/${id}/${action}`);
    },
    onSuccess: (_, { action }) => {
      toast({ title: `Offer ${action}ed` });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/my-listings"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to respond to offer", description: error.message, variant: "destructive" });
    },
  });

  const handleList = (nft: Nft) => {
    setSelectedNft(nft);
    setListPrice(config?.minListingPrice?.toString() || "0.01");
    setShowListModal(true);
  };

  const handleEdit = (listing: NftListing) => {
    setSelectedListing(listing);
    setListPrice(listing.priceSol);
    setShowEditModal(true);
  };

  const listedNftIds = new Set(myListings?.filter(l => l.status === "active").map(l => l.nftId));
  const unlistedNfts = ownedNfts?.filter(nft => !listedNftIds.has(nft.id)) || [];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-mono font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-4">
            Please log in to view and manage your NFTs.
          </p>
          <Link href="/">
            <Button>Go to Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/marketplace">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-xl font-mono font-bold uppercase">My NFTs</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Tabs defaultValue="owned" className="space-y-6">
          <TabsList className="font-mono">
            <TabsTrigger value="owned" data-testid="tab-owned">
              <Package className="w-4 h-4 mr-2" />
              Owned ({unlistedNfts.length})
            </TabsTrigger>
            <TabsTrigger value="listings" data-testid="tab-listings">
              <Tag className="w-4 h-4 mr-2" />
              My Listings ({myListings?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="offers" data-testid="tab-offers">
              <Clock className="w-4 h-4 mr-2" />
              My Offers ({myOffers?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="owned" className="space-y-6">
            {nftsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <Skeleton className="aspect-square" />
                    <CardContent className="p-3">
                      <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : unlistedNfts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {unlistedNfts.map((nft) => (
                  <OwnedNftCard key={nft.id} nft={nft} onList={handleList} />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-mono font-semibold mb-2">No NFTs in Your Wallet</h3>
                <p className="text-muted-foreground">
                  {ownedNfts && ownedNfts.length > 0 
                    ? "All your NFTs are currently listed for sale."
                    : "NFTs you own will appear here."}
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="listings" className="space-y-4">
            {listingsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : myListings && myListings.length > 0 ? (
              myListings.map((listing) => (
                <ListingCard 
                  key={listing.id} 
                  listing={listing}
                  onCancel={(id) => cancelListingMutation.mutate(id)}
                  onEdit={handleEdit}
                />
              ))
            ) : (
              <Card className="p-12 text-center">
                <Tag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-mono font-semibold mb-2">No Active Listings</h3>
                <p className="text-muted-foreground">
                  List your NFTs to start selling.
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="offers" className="space-y-4">
            {offersLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : myOffers && myOffers.length > 0 ? (
              myOffers.map((offer) => (
                <OfferCard 
                  key={offer.id} 
                  offer={offer}
                  type="made"
                />
              ))
            ) : (
              <Card className="p-12 text-center">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-mono font-semibold mb-2">No Offers Made</h3>
                <p className="text-muted-foreground">
                  Offers you make on NFTs will appear here.
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showListModal} onOpenChange={setShowListModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">List NFT for Sale</DialogTitle>
            <DialogDescription>
              Set a price for {selectedNft?.name || "your NFT"}. A {config?.feePercentage || 2.5}% marketplace fee applies.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="list-price" className="font-mono">Price (SOL)</Label>
              <Input
                id="list-price"
                type="number"
                step="0.01"
                min={config?.minListingPrice || 0.01}
                placeholder="0.00"
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value)}
                className="font-mono"
                data-testid="input-list-price"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum: {config?.minListingPrice || 0.01} SOL
              </p>
            </div>
            {listPrice && parseFloat(listPrice) > 0 && (
              <div className="p-3 rounded-md bg-muted/50 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Marketplace Fee</span>
                  <span className="font-mono">
                    -{(parseFloat(listPrice) * (config?.feePercentage || 2.5) / 100).toFixed(4)} SOL
                  </span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>You Receive</span>
                  <span className="font-mono">
                    {(parseFloat(listPrice) * (1 - (config?.feePercentage || 2.5) / 100)).toFixed(4)} SOL
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowListModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createListingMutation.mutate()}
              disabled={!listPrice || parseFloat(listPrice) < (config?.minListingPrice || 0.01) || createListingMutation.isPending}
              data-testid="button-confirm-list"
            >
              {createListingMutation.isPending ? "Listing..." : "List NFT"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">Update Listing Price</DialogTitle>
            <DialogDescription>
              Change the price for your listed NFT.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-price" className="font-mono">New Price (SOL)</Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                min={config?.minListingPrice || 0.01}
                placeholder="0.00"
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value)}
                className="font-mono"
                data-testid="input-edit-price"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => updateListingMutation.mutate()}
              disabled={!listPrice || parseFloat(listPrice) < (config?.minListingPrice || 0.01) || updateListingMutation.isPending}
              data-testid="button-confirm-edit"
            >
              {updateListingMutation.isPending ? "Updating..." : "Update Price"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
