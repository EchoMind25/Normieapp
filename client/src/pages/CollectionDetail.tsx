import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  ExternalLink, 
  Grid3X3, 
  Tag,
  TrendingUp,
  Users,
  BarChart3,
  CheckCircle,
  Wallet
} from "lucide-react";
import type { Nft, NftCollection, NftListing } from "@shared/schema";

interface ListingWithNft extends NftListing {
  nft: Nft;
}

function NftGridCard({ nft, listing }: { nft: Nft; listing?: NftListing }) {
  return (
    <Link href={`/marketplace/nft/${nft.id}`}>
      <Card 
        className="group cursor-pointer overflow-visible hover-elevate border-border/50 bg-card/80"
        data-testid={`card-nft-${nft.id}`}
      >
        <div className="relative aspect-square overflow-hidden rounded-t-md">
          {nft.imageUrl ? (
            <img 
              src={nft.imageUrl} 
              alt={nft.name || "NFT"} 
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Grid3X3 className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          {listing && (
            <Badge className="absolute bottom-2 left-2 bg-green-500/90 font-mono">
              {parseFloat(listing.priceSol).toFixed(2)} SOL
            </Badge>
          )}
        </div>
        <CardContent className="p-3">
          <h3 className="font-mono font-semibold text-sm truncate">{nft.name || "Unnamed"}</h3>
          {nft.rarityRank && (
            <p className="text-xs text-muted-foreground font-mono">Rank #{nft.rarityRank}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function CollectionDetail() {
  const [, params] = useRoute("/marketplace/collection/:id");
  const collectionId = params?.id;
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();

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

  const { data: collection, isLoading: collectionLoading } = useQuery<NftCollection>({
    queryKey: ["/api/collections", collectionId],
    enabled: !!collectionId,
  });

  const { data: nfts, isLoading: nftsLoading } = useQuery<Nft[]>({
    queryKey: ["/api/collections", collectionId, "nfts"],
    enabled: !!collectionId,
  });

  const { data: listings } = useQuery<ListingWithNft[]>({
    queryKey: ["/api/marketplace/collections", collectionId, "listings"],
    enabled: !!collectionId,
  });

  const listingMap = new Map(listings?.map(l => [l.nftId, l]));

  if (collectionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-48 w-full" />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Skeleton className="h-10 w-64 mb-4" />
          <div className="grid grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-mono font-bold mb-2">Collection Not Found</h2>
          <p className="text-muted-foreground mb-4">This collection doesn't exist.</p>
          <Link href="/marketplace">
            <Button>Back to Marketplace</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-48 md:h-64 overflow-hidden">
        {collection.bannerUrl ? (
          <img 
            src={collection.bannerUrl} 
            alt={collection.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        
        <div className="absolute top-4 left-4">
          <Link href="/marketplace">
            <Button variant="ghost" size="icon" className="bg-background/50 backdrop-blur-sm" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-20 relative z-10">
        <div className="flex items-end gap-4 mb-6">
          {collection.imageUrl && (
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-lg overflow-hidden border-4 border-background shadow-lg">
              <img 
                src={collection.imageUrl} 
                alt={collection.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-mono font-bold" data-testid="text-collection-name">
                {collection.name}
              </h1>
              {collection.verified && (
                <CheckCircle className="w-5 h-5 text-blue-500" />
              )}
            </div>
            <p className="text-muted-foreground font-mono">{collection.symbol}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-green-500/20">
                <Tag className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-mono uppercase">Floor Price</p>
                <p className="font-mono font-bold">
                  {collection.floorPrice ? `${parseFloat(collection.floorPrice).toFixed(2)} SOL` : "—"}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-blue-500/20">
                <BarChart3 className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-mono uppercase">Volume</p>
                <p className="font-mono font-bold">
                  {collection.totalVolume ? `${parseFloat(collection.totalVolume).toFixed(0)} SOL` : "—"}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-orange-500/20">
                <TrendingUp className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-mono uppercase">Sales</p>
                <p className="font-mono font-bold">{collection.totalSales || 0}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-purple-500/20">
                <Users className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-mono uppercase">Holders</p>
                <p className="font-mono font-bold">{collection.uniqueHolders || 0}</p>
              </div>
            </div>
          </Card>
        </div>

        {collection.description && (
          <Card className="p-4 mb-8 bg-card/80 backdrop-blur-sm">
            <p className="text-muted-foreground">{collection.description}</p>
          </Card>
        )}

        <Tabs defaultValue="listed" className="space-y-6">
          <TabsList className="font-mono">
            <TabsTrigger value="listed" data-testid="tab-listed">
              <Tag className="w-4 h-4 mr-2" />
              Listed ({listings?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="all" data-testid="tab-all">
              <Grid3X3 className="w-4 h-4 mr-2" />
              All Items ({nfts?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listed" className="space-y-6">
            {listings && listings.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {listings.map((item) => (
                  <NftGridCard key={item.id} nft={item.nft} listing={item} />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Tag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-mono font-semibold mb-2">No Items Listed</h3>
                <p className="text-muted-foreground">
                  No NFTs from this collection are currently for sale.
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-6">
            {nftsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i}>
                    <Skeleton className="aspect-square" />
                    <CardContent className="p-3">
                      <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : nfts && nfts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {nfts.map((nft) => (
                  <NftGridCard key={nft.id} nft={nft} listing={listingMap.get(nft.id)} />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Grid3X3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-mono font-semibold mb-2">No Items Found</h3>
                <p className="text-muted-foreground">
                  This collection doesn't have any NFTs indexed yet.
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
