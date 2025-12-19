import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Heart, 
  ExternalLink, 
  Copy, 
  Check,
  Tag,
  TrendingUp,
  Clock,
  User,
  Sparkles
} from "lucide-react";
import type { Nft, NftListing, NftCollection, NftTransaction } from "@shared/schema";

interface NftDetailData {
  nft: Nft;
  listing: NftListing | null;
  collection: NftCollection | null;
  transactions: NftTransaction[];
}

function AttributeTag({ trait, value }: { trait: string; value: string | number }) {
  return (
    <div className="p-2 rounded-md bg-muted/50 border border-border/50">
      <p className="text-xs text-muted-foreground font-mono uppercase">{trait}</p>
      <p className="text-sm font-mono font-semibold truncate">{String(value)}</p>
    </div>
  );
}

function TransactionRow({ tx }: { tx: NftTransaction }) {
  const date = tx.createdAt ? new Date(tx.createdAt) : new Date();
  
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="font-mono text-xs uppercase">
          {tx.transactionType}
        </Badge>
        <div>
          <p className="text-sm font-mono">
            {tx.priceSol ? `${parseFloat(tx.priceSol).toFixed(2)} SOL` : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {date.toLocaleDateString()}
          </p>
        </div>
      </div>
      {tx.txSignature && (
        <a 
          href={`https://solscan.io/tx/${tx.txSignature}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </div>
  );
}

export default function NftDetail() {
  const [, params] = useRoute("/marketplace/nft/:id");
  const nftId = params?.id;
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [copied, setCopied] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");

  const { data, isLoading } = useQuery<NftDetailData>({
    queryKey: ["/api/nfts", nftId],
    enabled: !!nftId,
  });

  const { data: favoriteStatus } = useQuery<{ isFavorited: boolean }>({
    queryKey: ["/api/marketplace/favorites", nftId, "check"],
    enabled: !!nftId && isAuthenticated,
  });

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (favoriteStatus?.isFavorited) {
        await apiRequest("DELETE", "/api/marketplace/favorites", { nftId });
      } else {
        await apiRequest("POST", "/api/marketplace/favorites", { nftId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/favorites", nftId, "check"] });
      toast({
        title: favoriteStatus?.isFavorited ? "Removed from favorites" : "Added to favorites",
      });
    },
  });

  const offerMutation = useMutation({
    mutationFn: async () => {
      if (!data?.listing) return;
      await apiRequest("POST", `/api/marketplace/listings/${data.listing.id}/offers`, {
        offerAmountSol: offerAmount,
      });
    },
    onSuccess: () => {
      setShowOfferModal(false);
      setOfferAmount("");
      toast({ title: "Offer submitted successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/nfts", nftId] });
    },
    onError: (error: any) => {
      toast({ title: "Failed to submit offer", description: error.message, variant: "destructive" });
    },
  });

  const copyAddress = () => {
    if (data?.nft.mintAddress) {
      navigator.clipboard.writeText(data.nft.mintAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const attributes = data?.nft.attributes 
    ? JSON.parse(data.nft.attributes) as Array<{ trait_type: string; value: string | number }>
    : [];

  const isOwner = data?.nft.ownerId === user?.id;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-32" />
              <Skeleton className="h-12" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data?.nft) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-mono font-bold mb-2">NFT Not Found</h2>
          <p className="text-muted-foreground mb-4">This NFT doesn't exist or has been removed.</p>
          <Link href="/marketplace">
            <Button>Back to Marketplace</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const { nft, listing, collection, transactions } = data;

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
            {collection && (
              <Link href={`/marketplace/collection/${collection.id}`}>
                <Badge variant="outline" className="font-mono hover-elevate cursor-pointer">
                  {collection.name}
                </Badge>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Card className="overflow-hidden">
              {nft.imageUrl ? (
                <img 
                  src={nft.imageUrl} 
                  alt={nft.name || "NFT"} 
                  className="w-full aspect-square object-cover"
                  data-testid="img-nft-detail"
                />
              ) : (
                <div className="w-full aspect-square bg-muted flex items-center justify-center">
                  <Sparkles className="w-24 h-24 text-muted-foreground" />
                </div>
              )}
            </Card>

            {attributes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-mono text-lg flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Attributes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {attributes.map((attr, i) => (
                      <AttributeTag key={i} trait={attr.trait_type} value={attr.value} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-mono font-bold mb-2" data-testid="text-nft-title">
                {nft.name || "Unnamed NFT"}
              </h1>
              <div className="flex items-center gap-3 flex-wrap">
                {nft.rarityRank && (
                  <Badge variant="secondary" className="font-mono">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Rank #{nft.rarityRank}
                  </Badge>
                )}
                <button 
                  onClick={copyAddress}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors font-mono"
                >
                  {nft.mintAddress.slice(0, 8)}...{nft.mintAddress.slice(-4)}
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {nft.description && (
              <p className="text-muted-foreground">{nft.description}</p>
            )}

            {listing && listing.status === "active" && (
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground font-mono uppercase">Current Price</p>
                    <p className="text-4xl font-mono font-bold" data-testid="text-listing-price">
                      {parseFloat(listing.priceSol).toFixed(2)} <span className="text-lg">SOL</span>
                    </p>
                  </div>
                  {isAuthenticated && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => favoriteMutation.mutate()}
                      disabled={favoriteMutation.isPending}
                      data-testid="button-favorite"
                    >
                      <Heart 
                        className={`w-5 h-5 ${favoriteStatus?.isFavorited ? "fill-red-500 text-red-500" : ""}`} 
                      />
                    </Button>
                  )}
                </div>

                {!isOwner && isAuthenticated && (
                  <div className="flex gap-3">
                    <Button className="flex-1" data-testid="button-buy-now">
                      Buy Now
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowOfferModal(true)}
                      data-testid="button-make-offer"
                    >
                      Make Offer
                    </Button>
                  </div>
                )}

                {isOwner && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    You own this NFT
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Marketplace Fee</span>
                    <span className="font-mono">{listing.marketplaceFee}%</span>
                  </div>
                  {listing.royaltyFee && (
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Creator Royalty</span>
                      <span className="font-mono">{listing.royaltyFee}%</span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {!listing && (
              <Card className="p-6">
                <p className="text-muted-foreground text-center">
                  This NFT is not currently listed for sale.
                </p>
                {isOwner && (
                  <Link href={`/marketplace/my-nfts`}>
                    <Button className="w-full mt-4" data-testid="button-list">
                      List for Sale
                    </Button>
                  </Link>
                )}
              </Card>
            )}

            <Tabs defaultValue="activity">
              <TabsList className="font-mono">
                <TabsTrigger value="activity">
                  <Clock className="w-4 h-4 mr-2" />
                  Activity
                </TabsTrigger>
                <TabsTrigger value="details">
                  Details
                </TabsTrigger>
              </TabsList>
              <TabsContent value="activity" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    {transactions && transactions.length > 0 ? (
                      transactions.map((tx) => (
                        <TransactionRow key={tx.id} tx={tx} />
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-4">
                        No transaction history yet.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="details" className="mt-4">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mint Address</span>
                      <a 
                        href={`https://solscan.io/token/${nft.mintAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm hover:underline flex items-center gap-1"
                      >
                        {nft.mintAddress.slice(0, 8)}...
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    {nft.ownerAddress && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Owner</span>
                        <a 
                          href={`https://solscan.io/account/${nft.ownerAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-sm hover:underline flex items-center gap-1"
                        >
                          {nft.ownerAddress.slice(0, 8)}...
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    {nft.royaltyPercentage && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Royalty</span>
                        <span className="font-mono text-sm">{nft.royaltyPercentage}%</span>
                      </div>
                    )}
                    {nft.lastSalePrice && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Sale</span>
                        <span className="font-mono text-sm">{parseFloat(nft.lastSalePrice).toFixed(2)} SOL</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <Dialog open={showOfferModal} onOpenChange={setShowOfferModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">Make an Offer</DialogTitle>
            <DialogDescription>
              Submit an offer for {nft.name || "this NFT"}. The seller can accept or reject your offer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="offer-amount" className="font-mono">Offer Amount (SOL)</Label>
              <Input
                id="offer-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                className="font-mono"
                data-testid="input-offer-amount"
              />
            </div>
            {listing && (
              <p className="text-sm text-muted-foreground">
                Listed price: {parseFloat(listing.priceSol).toFixed(2)} SOL
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOfferModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => offerMutation.mutate()}
              disabled={!offerAmount || offerMutation.isPending}
              data-testid="button-submit-offer"
            >
              {offerMutation.isPending ? "Submitting..." : "Submit Offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
