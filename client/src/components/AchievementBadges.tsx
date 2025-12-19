import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Diamond, Flame, Star, MessageCircle, Image, Crown, Sparkles, Clock } from "lucide-react";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: "diamond" | "flame" | "star" | "chat" | "image" | "crown" | "sparkles" | "og";
  earned: boolean;
  earnedAt?: string;
}

const ACHIEVEMENT_CONFIG = {
  diamond: { icon: Diamond, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  flame: { icon: Flame, color: "text-orange-400", bg: "bg-orange-500/10" },
  star: { icon: Star, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  chat: { icon: MessageCircle, color: "text-blue-400", bg: "bg-blue-500/10" },
  image: { icon: Image, color: "text-purple-400", bg: "bg-purple-500/10" },
  crown: { icon: Crown, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  sparkles: { icon: Sparkles, color: "text-primary", bg: "bg-primary/10" },
  og: { icon: Clock, color: "text-green-400", bg: "bg-green-500/10" },
};

export const AVAILABLE_ACHIEVEMENTS: Achievement[] = [
  {
    id: "diamond_hands",
    name: "Diamond Hands",
    description: "Held $NORMIE for 30+ days",
    icon: "diamond",
    earned: false,
  },
  {
    id: "og_normie",
    name: "OG Normie",
    description: "Early community member (joined in first week)",
    icon: "og",
    earned: false,
  },
  {
    id: "meme_lord",
    name: "Meme Lord",
    description: "Created 10+ approved gallery memes",
    icon: "image",
    earned: false,
  },
  {
    id: "top_creator",
    name: "Top Creator",
    description: "Reached top 3 on meme creator leaderboard",
    icon: "crown",
    earned: false,
  },
  {
    id: "chatter",
    name: "Active Chatter",
    description: "Sent 100+ messages in community chat",
    icon: "chat",
    earned: false,
  },
  {
    id: "fire_starter",
    name: "Fire Starter",
    description: "Received 50+ upvotes on a single meme",
    icon: "flame",
    earned: false,
  },
  {
    id: "community_star",
    name: "Community Star",
    description: "Featured meme in the gallery",
    icon: "star",
    earned: false,
  },
  {
    id: "early_supporter",
    name: "Early Supporter",
    description: "Participated in first community poll",
    icon: "sparkles",
    earned: false,
  },
];

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: "sm" | "md" | "lg";
}

export function AchievementBadge({ achievement, size = "md" }: AchievementBadgeProps) {
  const config = ACHIEVEMENT_CONFIG[achievement.icon];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };
  
  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all cursor-pointer ${
            achievement.earned
              ? `${config.bg} ${config.color} ring-1 ring-current/30`
              : "bg-muted/50 text-muted-foreground/30"
          }`}
          data-testid={`achievement-${achievement.id}`}
        >
          <Icon className={iconSizes[size]} />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="font-mono">
        <div className="text-center">
          <p className="font-bold">{achievement.name}</p>
          <p className="text-xs text-muted-foreground">{achievement.description}</p>
          {achievement.earned && achievement.earnedAt && (
            <p className="text-xs text-primary mt-1">
              Earned {new Date(achievement.earnedAt).toLocaleDateString()}
            </p>
          )}
          {!achievement.earned && (
            <p className="text-xs text-muted-foreground/50 mt-1">Not yet earned</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface AchievementDisplayProps {
  achievements: Achievement[];
  showAll?: boolean;
  maxDisplay?: number;
}

export function AchievementDisplay({ achievements, showAll = false, maxDisplay = 5 }: AchievementDisplayProps) {
  const earnedAchievements = achievements.filter((a) => a.earned);
  const unearnedAchievements = achievements.filter((a) => !a.earned);
  
  const displayAchievements = showAll
    ? [...earnedAchievements, ...unearnedAchievements]
    : earnedAchievements.slice(0, maxDisplay);

  if (displayAchievements.length === 0) {
    return (
      <div className="text-sm text-muted-foreground font-mono">
        No achievements yet
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5" data-testid="achievement-display">
      {displayAchievements.map((achievement) => (
        <AchievementBadge key={achievement.id} achievement={achievement} size="sm" />
      ))}
      {!showAll && earnedAchievements.length > maxDisplay && (
        <Badge variant="outline" className="font-mono text-xs">
          +{earnedAchievements.length - maxDisplay} more
        </Badge>
      )}
    </div>
  );
}
