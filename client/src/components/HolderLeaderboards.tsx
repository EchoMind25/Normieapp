import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Copy, Check, Diamond, Anchor, Trophy, Activity, Clock, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { DiamondHandsEntry, WhaleEntry } from "@shared/schema";

interface HolderStats {
  totalBuysTracked: number;
  totalWalletsTracked: number;
  status: "tracking" | "awaiting_data" | "error";
}

export function HolderLeaderboards() {
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: diamondHands, isLoading: diamondLoading } = useQuery<DiamondHandsEntry[]>({
    queryKey: ["/api/leaderboard/holders/diamond"],
    refetchInterval: 60000,
  });

  const { data: whales, isLoading: whalesLoading } = useQuery<WhaleEntry[]>({
    queryKey: ["/api/leaderboard/holders/whales"],
    refetchInterval: 60000,
  });

  const { data: stats } = useQuery<HolderStats>({
    queryKey: ["/api/leaderboard/holders/stats"],
    refetchInterval: 30000,
  });

  const copyWallet = (wallet: string) => {
    navigator.clipboard.writeText(wallet);
    setCopiedWallet(wallet);
    toast({
      title: "Wallet copied!",
      description: "Address copied to clipboard",
    });
    setTimeout(() => setCopiedWallet(null), 2000);
  };

  const truncateWallet = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toFixed(0);
  };

  const formatDuration = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    if (hours > 0) {
      return `${hours}h`;
    }
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  };

  const getRankBadge = (rank: number, type: "diamond" | "whale") => {
    if (rank === 1) {
      return (
        <Badge 
          variant={type === "diamond" ? "default" : "secondary"} 
          className="font-mono bg-primary/20 text-primary border-primary/30"
        >
          {type === "diamond" ? "OG" : "TOP WHALE"}
        </Badge>
      );
    }
    if (rank <= 3) {
      return <Badge variant="secondary" className="font-mono">#{rank}</Badge>;
    }
    return <span className="font-mono text-muted-foreground">#{rank}</span>;
  };

  const renderLeaderboard = (
    entries: DiamondHandsEntry[] | WhaleEntry[] | undefined,
    isLoading: boolean,
    type: "diamond" | "whale"
  ) => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-6 flex-1" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      );
    }

    if (!entries || entries.length === 0) {
      return (
        <div className="text-center py-8">
          {type === "diamond" ? (
            <Diamond className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          ) : (
            <Anchor className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          )}
          <p className="text-muted-foreground font-mono">No holders found yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats?.status === "tracking" 
              ? "Tracking active - waiting for data..."
              : "Data will populate after backfill"}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.walletAddress}
            className="flex items-center gap-3 p-3 rounded-md bg-muted/30 hover-elevate"
            data-testid={`${type}-entry-${entry.rank}`}
          >
            <div className="w-20 flex-shrink-0">
              {getRankBadge(entry.rank, type)}
            </div>
            
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <code className="font-mono text-sm truncate">
                {entry.username || truncateWallet(entry.walletAddress)}
              </code>
              {entry.username && (
                <span className="text-xs text-muted-foreground font-mono">
                  ({truncateWallet(entry.walletAddress)})
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => copyWallet(entry.walletAddress)}
                data-testid={`button-copy-${type}-wallet-${entry.rank}`}
              >
                {copiedWallet === entry.walletAddress ? (
                  <Check className="h-3 w-3 text-primary" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
              <a
                href={entry.solscanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0"
                data-testid={`link-${type}-solscan-${entry.rank}`}
              >
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </a>
            </div>

            <div className="text-right flex-shrink-0">
              {type === "diamond" ? (
                <>
                  <p className="font-mono font-bold text-primary flex items-center gap-1 justify-end">
                    <Clock className="h-3 w-3" />
                    {formatDuration(entry.holdDurationSeconds)}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {formatAmount(entry.currentBalance)} tokens
                  </p>
                </>
              ) : (
                <>
                  <p className="font-mono font-bold text-primary flex items-center gap-1 justify-end">
                    <Coins className="h-3 w-3" />
                    {formatAmount(entry.currentBalance)}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    holding {formatDuration(entry.holdDurationSeconds)}
                  </p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Diamond className="h-5 w-5 text-primary" />
          <h3 className="font-mono text-lg font-bold uppercase tracking-wider">
            Top Holders
          </h3>
          <Trophy className="h-4 w-4 text-yellow-500" />
        </div>
      </div>

      <Tabs defaultValue="diamond" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="diamond" className="font-mono text-xs" data-testid="tab-diamond-hands">
            <Diamond className="h-3 w-3 mr-1" />
            Diamond Hands
          </TabsTrigger>
          <TabsTrigger value="whales" className="font-mono text-xs" data-testid="tab-whales">
            <Anchor className="h-3 w-3 mr-1" />
            Top Whales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="diamond">
          <p className="text-sm text-muted-foreground mb-4 font-mono">
            Hall of fame: wallets holding $NORMIE the longest
          </p>
          {renderLeaderboard(diamondHands, diamondLoading, "diamond")}
        </TabsContent>

        <TabsContent value="whales">
          <p className="text-sm text-muted-foreground mb-4 font-mono">
            Biggest bags: wallets with the most $NORMIE
          </p>
          {renderLeaderboard(whales, whalesLoading, "whale")}
        </TabsContent>
      </Tabs>

      <div className="mt-4 pt-4 border-t border-border flex items-center justify-center gap-2">
        <Activity className="h-3 w-3 text-primary animate-pulse" />
        <p className="text-xs text-muted-foreground font-mono text-center">
          Tracking all $NORMIE holders
          {stats?.totalWalletsTracked ? ` (${stats.totalWalletsTracked} wallets)` : ""}
        </p>
      </div>
    </Card>
  );
}
