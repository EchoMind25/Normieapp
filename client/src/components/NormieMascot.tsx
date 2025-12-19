import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface NormieMascotProps {
  priceChange?: number;
  className?: string;
  onClickSound?: () => void;
}

type MascotMood = "pumping" | "neutral" | "dipping" | "diamond";
type PriceSeverity = "moonshot" | "pumping" | "mild_up" | "neutral" | "mild_dip" | "dipping" | "dumping" | "crash" | "diamond";

const getMoodFromChange = (change: number): MascotMood => {
  if (change > 5) return "pumping";
  if (change < -5) return "dipping";
  return "neutral";
};

const getSeverityFromChange = (change: number): PriceSeverity => {
  if (change > 20) return "moonshot";
  if (change > 10) return "pumping";
  if (change > 3) return "mild_up";
  if (change >= -3) return "neutral";
  if (change >= -10) return "mild_dip";
  if (change >= -20) return "dipping";
  if (change >= -35) return "dumping";
  return "crash";
};

const severityMessages: Record<PriceSeverity, string[]> = {
  moonshot: [
    "MOONING! Strap in!",
    "Normies eating good today!",
    "Where lambo? HERE LAMBO!",
    "This is what diamond hands look like!",
  ],
  pumping: [
    "LFG! We're pumping!",
    "To the moon!",
    "Number go up!",
    "Wagmi fren!",
    "Green candles everywhere!",
  ],
  mild_up: [
    "Looking good!",
    "Steady gains!",
    "The chart is looking healthy",
    "Slow and steady wins the race",
  ],
  neutral: [
    "Chillin...",
    "Steady as she goes",
    "Comfy hold",
    "Just normie things",
    "Sideways action, no stress",
  ],
  mild_dip: [
    "Small dip, no worries",
    "Just a pullback",
    "Healthy consolidation",
    "Nothing to panic about",
  ],
  dipping: [
    "Stay strong, normie!",
    "Dips are for buying",
    "Diamond hands activated",
    "We've seen worse, we'll see better",
  ],
  dumping: [
    "Rough day out there...",
    "Tough times don't last, tough normies do",
    "This too shall pass",
    "Stay calm and HODL on",
    "Not gonna lie, this hurts",
  ],
  crash: [
    "Absolute carnage...",
    "Blood in the streets",
    "Only diamond hands survive this",
    "This is the ultimate test",
    "If you're reading this, you're still here",
    "Survivors will be rewarded",
  ],
  diamond: [
    "DIAMOND HANDS ACTIVATED!",
    "Unshakeable!",
    "Never selling!",
    "Hands of pure diamond!",
  ],
};

export function NormieMascot({ priceChange = 0, className = "", onClickSound }: NormieMascotProps) {
  const [mood, setMood] = useState<MascotMood>("neutral");
  const [isAnimating, setIsAnimating] = useState(false);
  const [clickBounce, setClickBounce] = useState(false);
  const prevChangeRef = useRef(priceChange);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const newMood = getMoodFromChange(priceChange);
    if (newMood !== mood) {
      setMood(newMood);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);
    }
    prevChangeRef.current = priceChange;
  }, [priceChange, mood]);

  const renderExpression = () => {
    switch (mood) {
      case "pumping":
        return (
          <>
            <circle cx="35" cy="45" r="8" fill="hsl(var(--primary))" className="animate-pulse" />
            <circle cx="65" cy="45" r="8" fill="hsl(var(--primary))" className="animate-pulse" />
            <path
              d="M 30 70 Q 50 90 70 70"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
            <text x="50" y="20" textAnchor="middle" className="text-xs fill-primary font-bold animate-bounce">
              LFG!
            </text>
          </>
        );
      case "dipping":
        return (
          <>
            <circle cx="35" cy="45" r="6" fill="hsl(var(--muted-foreground))" />
            <circle cx="65" cy="45" r="6" fill="hsl(var(--muted-foreground))" />
            <line x1="25" y1="35" x2="40" y2="40" stroke="hsl(var(--muted-foreground))" strokeWidth="2" />
            <line x1="75" y1="35" x2="60" y2="40" stroke="hsl(var(--muted-foreground))" strokeWidth="2" />
            <path
              d="M 30 75 Q 50 65 70 75"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            <text x="50" y="20" textAnchor="middle" className="text-xs fill-muted-foreground font-mono">
              HODL
            </text>
          </>
        );
      case "diamond":
        return (
          <>
            <polygon
              points="35,42 30,50 35,58 40,50"
              fill="hsl(180, 70%, 50%)"
              className="animate-pulse"
            />
            <polygon
              points="65,42 60,50 65,58 70,50"
              fill="hsl(180, 70%, 50%)"
              className="animate-pulse"
            />
            <path
              d="M 35 70 L 50 75 L 65 70"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          </>
        );
      default:
        return (
          <>
            <circle cx="35" cy="48" r="5" fill="hsl(var(--foreground))" />
            <circle cx="65" cy="48" r="5" fill="hsl(var(--foreground))" />
            <path
              d="M 35 70 Q 50 78 65 70"
              stroke="hsl(var(--foreground))"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          </>
        );
    }
  };

  const handleClick = () => {
    const severity = mood === "diamond" ? "diamond" : getSeverityFromChange(priceChange);
    const messages = severityMessages[severity];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    const formattedChange = Math.abs(priceChange) < 0.01 
      ? "~0%" 
      : `${priceChange > 0 ? "+" : ""}${priceChange.toFixed(2)}%`;
    
    toast({
      title: randomMessage,
      description: `${formattedChange} in 24h`,
    });
    
    setClickBounce(true);
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = setTimeout(() => setClickBounce(false), 300);
    
    onClickSound?.();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`relative cursor-pointer transition-transform active:scale-95 ${className}`}
      data-testid="normie-mascot"
      title={`Click me! Mood: ${mood} (${priceChange > 0 ? "+" : ""}${priceChange.toFixed(2)}%)`}
      aria-label={`Normie mascot showing ${mood} mood`}
    >
      <svg
        viewBox="0 0 100 100"
        className={`w-full h-full transition-transform duration-300 ${
          isAnimating || clickBounce ? "scale-110" : "scale-100"
        } ${mood === "pumping" ? "animate-bounce" : ""}`}
      >
        <circle
          cx="50"
          cy="55"
          r="40"
          fill="hsl(var(--card))"
          stroke={
            mood === "pumping"
              ? "hsl(var(--primary))"
              : mood === "dipping"
              ? "hsl(var(--muted))"
              : "hsl(var(--border))"
          }
          strokeWidth="3"
          className="transition-colors duration-300"
        />
        
        {renderExpression()}
        
        {mood === "pumping" && (
          <>
            <circle cx="20" cy="30" r="3" fill="hsl(var(--primary))" className="animate-ping" style={{ animationDelay: "0s" }} />
            <circle cx="80" cy="25" r="2" fill="hsl(var(--primary))" className="animate-ping" style={{ animationDelay: "0.2s" }} />
            <circle cx="85" cy="70" r="2" fill="hsl(var(--primary))" className="animate-ping" style={{ animationDelay: "0.4s" }} />
          </>
        )}
      </svg>
    </button>
  );
}
