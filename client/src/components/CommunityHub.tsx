import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ExternalLink,
  Vote,
  MessageCircle,
  Flame,
  Lock,
  TrendingUp,
  Clock,
  Users,
  Zap,
} from "lucide-react";
import { SiTelegram, SiX } from "react-icons/si";
import { NORMIE_TOKEN } from "@shared/schema";
import type { Poll, ActivityItem } from "@shared/schema";

const SAMPLE_POLLS: Poll[] = [
  {
    id: "poll-1",
    question: "Next burn milestone target?",
    options: [
      { id: "opt-1", text: "600M tokens", votes: 234 },
      { id: "opt-2", text: "700M tokens", votes: 456 },
      { id: "opt-3", text: "1B tokens", votes: 123 },
    ],
    totalVotes: 813,
    isActive: true,
  },
  {
    id: "poll-2",
    question: "Which merch should drop next?",
    options: [
      { id: "opt-1", text: "Socks", votes: 156 },
      { id: "opt-2", text: "Phone Cases", votes: 289 },
      { id: "opt-3", text: "Stickers Pack", votes: 201 },
      { id: "opt-4", text: "Caps/Hats", votes: 178 },
    ],
    totalVotes: 824,
    isActive: true,
  },
];

const SAMPLE_ACTIVITY: ActivityItem[] = [
  {
    id: "act-1",
    type: "burn",
    message: "31M tokens burned by dev team",
    amount: 31000000,
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "act-2",
    type: "lock",
    message: "230M tokens locked in vault",
    amount: 230000000,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "act-3",
    type: "milestone",
    message: "Reached 1,500 holders milestone!",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: "act-4",
    type: "trade",
    message: "Large buy detected: 50 SOL",
    amount: 50,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
  {
    id: "act-5",
    type: "burn",
    message: "Weekly burn executed: 15M tokens",
    amount: 15000000,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "act-6",
    type: "milestone",
    message: "Market cap surpassed $200K ATH",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  burn: <Flame className="h-4 w-4 text-destructive" />,
  lock: <Lock className="h-4 w-4 text-chart-3" />,
  milestone: <TrendingUp className="h-4 w-4 text-primary" />,
  trade: <Zap className="h-4 w-4 text-chart-2" />,
};

export function CommunityHub() {
  const [polls, setPolls] = useState(SAMPLE_POLLS);
  const [votedPolls, setVotedPolls] = useState<Set<string>>(new Set());

  const handleVote = (pollId: string, optionId: string) => {
    if (votedPolls.has(pollId)) return;

    setPolls((prev) =>
      prev.map((poll) => {
        if (poll.id === pollId) {
          return {
            ...poll,
            options: poll.options.map((opt) =>
              opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
            ),
            totalVotes: poll.totalVotes + 1,
          };
        }
        return poll;
      })
    );
    setVotedPolls((prev) => new Set(prev).add(pollId));
  };

  const formatTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <section id="community" className="py-8 lg:py-12 px-4 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl lg:text-3xl font-mono font-bold uppercase tracking-tight">
            COMMUNITY HUB
          </h2>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            Normies unite. Get chaotic. Join the raids.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Vote className="h-4 w-4" />
              Community Polls
            </h3>
            {polls.map((poll) => (
              <Card key={poll.id} className="p-4" data-testid={`card-poll-${poll.id}`}>
                <div className="flex items-start justify-between gap-2 mb-4">
                  <h4 className="font-mono font-medium">{poll.question}</h4>
                  {poll.isActive && (
                    <Badge variant="outline" className="text-xs">
                      Live
                    </Badge>
                  )}
                </div>
                <div className="space-y-3">
                  {poll.options.map((option) => {
                    const percentage = poll.totalVotes > 0 
                      ? (option.votes / poll.totalVotes) * 100 
                      : 0;
                    const hasVoted = votedPolls.has(poll.id);

                    return (
                      <button
                        key={option.id}
                        className={`w-full text-left p-3 rounded-md border transition-colors ${
                          hasVoted
                            ? "cursor-default"
                            : "hover-elevate cursor-pointer"
                        }`}
                        onClick={() => handleVote(poll.id, option.id)}
                        disabled={hasVoted}
                        data-testid={`button-vote-${poll.id}-${option.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-mono">{option.text}</span>
                          <span className="text-xs font-mono text-muted-foreground">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {option.votes} votes
                        </p>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {poll.totalVotes} total votes
                  </span>
                  <a
                    href={`https://t.me/${NORMIE_TOKEN.telegram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-primary flex items-center gap-1"
                    data-testid="link-discuss-telegram"
                  >
                    Discuss <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Flame className="h-4 w-4" />
              Activity Feed
            </h3>
            <Card className="p-0 overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 border-b flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-mono text-muted-foreground">
                  LIVE TERMINAL
                </span>
              </div>
              <ScrollArea className="h-80">
                <div className="p-4 space-y-3 font-mono text-sm">
                  {SAMPLE_ACTIVITY.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-2 rounded-md bg-muted/30"
                      data-testid={`activity-${item.id}`}
                    >
                      <div className="mt-0.5">{ACTIVITY_ICONS[item.type]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground">{item.message}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(item.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="animate-blink">_</span>
                    <span className="text-xs">Awaiting next event...</span>
                  </div>
                </div>
              </ScrollArea>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Join The Nation
            </h3>
            
            <Card className="p-6 bg-gradient-to-br from-[#0088cc]/10 to-transparent border-[#0088cc]/30">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-[#0088cc] flex items-center justify-center">
                  <SiTelegram className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-mono font-bold">Telegram</h4>
                  <p className="text-sm text-muted-foreground">{NORMIE_TOKEN.telegram}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Join the official Normie Nation chat. Daily alpha, raid coordination, and community vibes.
              </p>
              <a
                href={`https://t.me/${NORMIE_TOKEN.telegram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-join-telegram"
              >
                <Button className="w-full bg-[#0088cc]">
                  <SiTelegram className="h-4 w-4 mr-2" />
                  Join Telegram
                </Button>
              </a>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-foreground/5 to-transparent">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-foreground flex items-center justify-center">
                  <SiX className="h-6 w-6 text-background" />
                </div>
                <div>
                  <h4 className="font-mono font-bold">X (Twitter)</h4>
                  <p className="text-sm text-muted-foreground">{NORMIE_TOKEN.twitter}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Follow for daily updates, burn announcements, and community spaces. Get chaotic with us!
              </p>
              <a
                href={`https://x.com/${NORMIE_TOKEN.twitter.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-follow-twitter"
              >
                <Button variant="outline" className="w-full">
                  <SiX className="h-4 w-4 mr-2" />
                  Follow @NormieCEO
                </Button>
              </a>
            </Card>

            <Card className="p-4 border-primary/30 bg-primary/5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-5 w-5 text-primary" />
                <h4 className="font-mono font-bold text-sm">Mission Statement</h4>
              </div>
              <blockquote className="text-sm text-muted-foreground italic border-l-2 border-primary pl-3">
                "Relentless execution. Massive burns. Community raids. Merch empire. 
                We're building a supply stranglehold that makes diamond hands look paper."
              </blockquote>
              <p className="text-xs text-muted-foreground mt-3 text-right">
                — @NormieCEO
              </p>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
