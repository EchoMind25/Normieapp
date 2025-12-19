import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Image, MessageCircle, Crown, Medal, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaderboardEntry {
  userId: string;
  username: string;
  avatarUrl?: string;
  score: number;
  rank: number;
}

interface LeaderboardData {
  topCreators: LeaderboardEntry[];
  topChatters: LeaderboardEntry[];
}

const RANK_ICONS = [
  { icon: Crown, color: "text-yellow-400" },
  { icon: Medal, color: "text-gray-300" },
  { icon: Award, color: "text-amber-600" },
];

function getRankDisplay(rank: number) {
  if (rank <= 3) {
    const config = RANK_ICONS[rank - 1];
    const Icon = config.icon;
    return <Icon className={`w-5 h-5 ${config.color}`} />;
  }
  return <span className="text-muted-foreground font-mono text-sm">#{rank}</span>;
}

function LeaderboardList({ entries, type }: { entries: LeaderboardEntry[]; type: "creators" | "chatters" }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground font-mono text-sm">
        No {type === "creators" ? "meme creators" : "active members"} yet. Be the first!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.userId}
          className={`flex items-center gap-3 p-3 rounded-md transition-colors ${
            entry.rank <= 3 ? "bg-primary/5 border border-primary/20" : "bg-muted/30"
          }`}
          data-testid={`leaderboard-entry-${entry.userId}`}
        >
          <div className="w-8 flex justify-center">
            {getRankDisplay(entry.rank)}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-mono font-medium truncate">
              {entry.username}
            </p>
          </div>
          
          <Badge variant="outline" className="font-mono">
            {type === "creators" ? (
              <>
                <Image className="w-3 h-3 mr-1" />
                {entry.score} upvotes
              </>
            ) : (
              <>
                <MessageCircle className="w-3 h-3 mr-1" />
                {entry.score} msgs
              </>
            )}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-muted/30 rounded-md">
          <Skeleton className="w-8 h-5" />
          <Skeleton className="flex-1 h-5" />
          <Skeleton className="w-20 h-6" />
        </div>
      ))}
    </div>
  );
}

export function Leaderboard() {
  const { data, isLoading } = useQuery<LeaderboardData>({
    queryKey: ["/api/leaderboard"],
    refetchInterval: 60000,
  });

  return (
    <Card className="border-primary/20" data-testid="leaderboard-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-mono">
          <Trophy className="w-5 h-5 text-primary" />
          Community Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="creators" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="creators" className="font-mono text-xs" data-testid="tab-creators">
              <Image className="w-3.5 h-3.5 mr-1.5" />
              Top Creators
            </TabsTrigger>
            <TabsTrigger value="chatters" className="font-mono text-xs" data-testid="tab-chatters">
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
              Most Active
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="creators">
            {isLoading ? (
              <LeaderboardSkeleton />
            ) : (
              <LeaderboardList 
                entries={data?.topCreators || []} 
                type="creators" 
              />
            )}
          </TabsContent>
          
          <TabsContent value="chatters">
            {isLoading ? (
              <LeaderboardSkeleton />
            ) : (
              <LeaderboardList 
                entries={data?.topChatters || []} 
                type="chatters" 
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
