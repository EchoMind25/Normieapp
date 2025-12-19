import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  TrendingUp, 
  Heart, 
  Grid3X3, 
  List, 
  ArrowUpRight,
  Sparkles,
  Flame,
  Clock,
  Wallet
} from "lucide-react";
import type { Nft, NftCollection, NftListing } from "@shared/schema";

interface ListingWithNft extends NftListing {
  nft: Nft;
}

interface MarketplaceConfig {
  feePercentage: number;
  minListingPrice: number;
  maxListingDurationDays: number;
  offerExpirationDays: number;
  treasuryWallet: string | null;
}

function NftCard({ listing }: { listing: ListingWithNft }) {
  const { nft, priceSol, listedAt } = listing;
  const listedDate = listedAt ? new Date(listedAt) : new Date();
  const isNew = Date.now() - listedDate.getTime() < 24 * 60 * 60 * 1000;

  return (
    <Link href={`/marketplace/nft/${nft.id}`}>
      <Card 
        className="group cursor-pointer overflow-visible hover-elevate border-border/50 bg-card/80 backdrop-blur-sm"
        data-testid={`card-nft-${nft.id}`}
      >
        <div className="relative aspect-square overflow-hidden">
          {nft.imageUrl ? (
            <img 
              src={nft.imageUrl} 
              alt={nft.name || "NFT"} 
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              data-testid={`img-nft-${nft.id}`}
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Grid3X3 className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
          {isNew && (
            <Badge className="absolute top-2 left-2 bg-green-500/90 text-white text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              NEW
            </Badge>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <CardContent className="p-3">
          <h3 className="font-mono font-semibold text-sm truncate" data-testid={`text-nft-name-${nft.id}`}>
            {nft.name || "Unnamed NFT"}
          </h3>
          {nft.rarityRank && (
            <p className="text-xs text-muted-foreground font-mono">
              Rank #{nft.rarityRank}
            </p>
          )}
        </CardContent>
        <CardFooter className="p-3 pt-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <span className="text-lg font-bold font-mono text-foreground" data-testid={`text-price-${nft.id}`}>
              {parseFloat(priceSol).toFixed(2)}
            </span>
            <span className="text-sm text-muted-foreground">SOL</span>
          </div>
          <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowUpRight className="w-4 h-4" />
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}

function CollectionCard({ collection }: { collection: NftCollection }) {
  return (
    <Link href={`/marketplace/collection/${collection.id}`}>
      <Card 
        className="group cursor-pointer overflow-visible hover-elevate border-border/50 bg-card/80 backdrop-blur-sm"
        data-testid={`card-collection-${collection.id}`}
      >
        <div className="relative aspect-[2/1] overflow-hidden rounded-t-md">
          {collection.bannerUrl || collection.imageUrl ? (
            <img 
              src={collection.bannerUrl || collection.imageUrl || ""} 
              alt={collection.name} 
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          {collection.verified && (
            <Badge className="absolute top-2 right-2 bg-blue-500/90 text-xs">
              Verified
            </Badge>
          )}
          <div className="absolute bottom-2 left-2 flex items-center gap-2">
            {collection.imageUrl && (
              <img 
                src={collection.imageUrl} 
                alt="" 
                className="w-10 h-10 rounded-md border-2 border-background"
              />
            )}
            <div>
              <h3 className="font-mono font-semibold text-white text-sm">
                {collection.name}
              </h3>
              <p className="text-xs text-white/70 font-mono">
                {collection.symbol}
              </p>
            </div>
          </div>
        </div>
        <CardContent className="p-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-muted-foreground font-mono uppercase">Floor</p>
              <p className="font-mono font-bold text-sm">
                {collection.floorPrice ? `${parseFloat(collection.floorPrice).toFixed(2)} SOL` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-mono uppercase">Volume</p>
              <p className="font-mono font-bold text-sm">
                {collection.totalVolume ? `${parseFloat(collection.totalVolume).toFixed(0)} SOL` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-mono uppercase">Listed</p>
              <p className="font-mono font-bold text-sm">
                {collection.totalListings || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function LoadingGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="aspect-square w-full" />
          <CardContent className="p-3">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </CardContent>
          <CardFooter className="p-3 pt-0">
            <Skeleton className="h-6 w-20" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

export default function Marketplace() {
  const { user, isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: config } = useQuery<MarketplaceConfig>({
    queryKey: ["/api/marketplace/config"],
  });

  // Admin-only access check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center font-mono">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
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

  const { data: listings, isLoading: listingsLoading } = useQuery<ListingWithNft[]>({
    queryKey: ["/api/marketplace/listings"],
  });

  const { data: collections, isLoading: collectionsLoading } = useQuery<NftCollection[]>({
    queryKey: ["/api/collections"],
  });

  const { data: recentSales } = useQuery<any[]>({
    queryKey: ["/api/marketplace/recent-sales", { limit: 10 }],
  });

  const filteredListings = listings?.filter(listing => 
    !searchQuery || 
    listing.nft.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.nft.mintAddress.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back-home">
                  <ArrowUpRight className="w-4 h-4 rotate-[225deg]" />
                </Button>
              </Link>
              <h1 className="text-2xl font-mono font-bold uppercase tracking-wider">
                NFT Marketplace
              </h1>
              {config && (
                <Badge variant="outline" className="font-mono text-xs">
                  {config.feePercentage}% Fee
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search NFTs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 font-mono"
                  data-testid="input-search"
                />
              </div>
              
              <div className="flex items-center border rounded-md">
                <Button 
                  variant={viewMode === "grid" ? "secondary" : "ghost"} 
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  data-testid="button-view-grid"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button 
                  variant={viewMode === "list" ? "secondary" : "ghost"} 
                  size="icon"
                  onClick={() => setViewMode("list")}
                  data-testid="button-view-list"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              {isAuthenticated && (
                <Link href="/marketplace/my-nfts">
                  <Button variant="outline" data-testid="button-my-nfts">
                    <Wallet className="w-4 h-4 mr-2" />
                    My NFTs
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-green-500/20">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-mono uppercase">Total Listings</p>
                <p className="text-xl font-mono font-bold">{listings?.length || 0}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-orange-500/20">
                <Flame className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-mono uppercase">Collections</p>
                <p className="text-xl font-mono font-bold">{collections?.length || 0}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-blue-500/20">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-mono uppercase">Recent Sales</p>
                <p className="text-xl font-mono font-bold">{recentSales?.length || 0}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-purple-500/20">
                <Heart className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-mono uppercase">Min Price</p>
                <p className="text-xl font-mono font-bold">{config?.minListingPrice || 0.01} SOL</p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="listings" className="space-y-6">
          <TabsList className="font-mono">
            <TabsTrigger value="listings" data-testid="tab-listings">
              <Grid3X3 className="w-4 h-4 mr-2" />
              Listed NFTs
            </TabsTrigger>
            <TabsTrigger value="collections" data-testid="tab-collections">
              <Flame className="w-4 h-4 mr-2" />
              Collections
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="space-y-6">
            {listingsLoading ? (
              <LoadingGrid />
            ) : filteredListings && filteredListings.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredListings.map((listing) => (
                  <NftCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Grid3X3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-mono font-semibold mb-2">No NFTs Listed</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery 
                    ? "No NFTs match your search query."
                    : "Be the first to list your NFT on the marketplace!"
                  }
                </p>
                {isAuthenticated && (
                  <Link href="/marketplace/my-nfts">
                    <Button data-testid="button-list-nft">
                      List Your NFT
                    </Button>
                  </Link>
                )}
              </Card>
            )}
          </TabsContent>

          <TabsContent value="collections" className="space-y-6">
            {collectionsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="aspect-[2/1] w-full" />
                    <CardContent className="p-3">
                      <div className="grid grid-cols-3 gap-2">
                        <Skeleton className="h-8" />
                        <Skeleton className="h-8" />
                        <Skeleton className="h-8" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : collections && collections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {collections.map((collection) => (
                  <CollectionCard key={collection.id} collection={collection} />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Flame className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-mono font-semibold mb-2">No Collections Yet</h3>
                <p className="text-muted-foreground">
                  Collections will appear here once NFTs are listed.
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
