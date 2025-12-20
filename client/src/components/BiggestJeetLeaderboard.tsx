import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Copy, Check, TrendingDown, Trophy, AlertTriangle, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { JeetLeaderboardEntry } from "@shared/schema";

type TimeRange = "24h" | "7d" | "30d" | "all";

interface JeetStats {
  totalSellsTracked: number;
  status: "tracking" | "awaiting_data" | "error";
}

export function BiggestJeetLeaderboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: leaderboard, isLoading } = useQuery<JeetLeaderboardEntry[]>({
    queryKey: ["/api/leaderboard/jeets", timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/leaderboard/jeets?range=${timeRange}`);
      if (!response.ok) throw new Error("Failed to fetch leaderboard");
      return response.json();
    },
    refetchInterval: 60000,
  });

  const { data: stats } = useQuery<JeetStats>({
    queryKey: ["/api/leaderboard/jeets/stats"],
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

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return <Badge variant="destructive" className="font-mono">TOP JEET</Badge>;
    }
    if (rank <= 3) {
      return <Badge variant="secondary" className="font-mono">#{rank}</Badge>;
    }
    return <span className="font-mono text-muted-foreground">#{rank}</span>;
  };

  return (
    <Card className="p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h3 className="font-mono text-lg font-bold uppercase tracking-wider">
            Biggest Jeets
          </h3>
          <Trophy className="h-4 w-4 text-yellow-500" />
        </div>
        <div className="flex gap-1">
          {(["24h", "7d", "30d", "all"] as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimeRange(range)}
              data-testid={`button-jeet-range-${range}`}
              className="font-mono text-xs"
            >
              {range === "all" ? "All Time" : range.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4 font-mono">
        Hall of shame: wallets that sold the most $NORMIE
      </p>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-6 flex-1" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      ) : !leaderboard || leaderboard.length === 0 ? (
        <div className="text-center py-8">
          <TrendingDown className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground font-mono">No jeets found yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats?.status === "tracking" 
              ? "Tracking active - waiting for sells..."
              : "Diamond hands everywhere!"}
          </p>
          {stats?.totalSellsTracked !== undefined && stats.totalSellsTracked > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {stats.totalSellsTracked} sells tracked
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry) => (
            <div
              key={entry.walletAddress}
              className="flex items-center gap-3 p-3 rounded-md bg-muted/30 hover-elevate"
              data-testid={`jeet-entry-${entry.rank}`}
            >
              <div className="w-16 flex-shrink-0">
                {getRankBadge(entry.rank)}
              </div>
              
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <code className="font-mono text-sm truncate">
                  {truncateWallet(entry.walletAddress)}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={() => copyWallet(entry.walletAddress)}
                  data-testid={`button-copy-wallet-${entry.rank}`}
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
                  data-testid={`link-solscan-${entry.rank}`}
                >
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </a>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="font-mono font-bold text-destructive">
                  {formatAmount(entry.totalSold)}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {entry.sellCount} sells
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border flex items-center justify-center gap-2">
        <Activity className="h-3 w-3 text-primary animate-pulse" />
        <p className="text-xs text-muted-foreground font-mono text-center">
          Live tracking all $NORMIE sells
          {stats?.totalSellsTracked ? ` (${stats.totalSellsTracked} tracked)` : ""}
        </p>
      </div>
    </Card>
  );
}
