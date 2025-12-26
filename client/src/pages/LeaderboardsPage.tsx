import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BiggestJeetLeaderboard } from "@/components/BiggestJeetLeaderboard";
import { HolderLeaderboards } from "@/components/HolderLeaderboards";

export default function LeaderboardsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-mono font-bold">Leaderboards</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-24">
        <BiggestJeetLeaderboard />
        <HolderLeaderboards />
      </main>
    </div>
  );
}
