import { useState, useEffect, useRef } from "react";

interface NormieMascotProps {
  priceChange?: number;
  className?: string;
}

type MascotMood = "pumping" | "neutral" | "dipping" | "diamond";

const getMoodFromChange = (change: number): MascotMood => {
  if (change > 5) return "pumping";
  if (change < -5) return "dipping";
  return "neutral";
};

export function NormieMascot({ priceChange = 0, className = "" }: NormieMascotProps) {
  const [mood, setMood] = useState<MascotMood>("neutral");
  const [isAnimating, setIsAnimating] = useState(false);
  const prevChangeRef = useRef(priceChange);

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

  return (
    <div
      className={`relative ${className}`}
      data-testid="normie-mascot"
      title={`Mood: ${mood} (${priceChange > 0 ? "+" : ""}${priceChange.toFixed(2)}%)`}
    >
      <svg
        viewBox="0 0 100 100"
        className={`w-full h-full transition-transform duration-300 ${
          isAnimating ? "scale-110" : "scale-100"
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
    </div>
  );
}
