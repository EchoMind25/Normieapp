import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUp, ArrowDown, Flame } from "lucide-react";

interface ActivityItem {
  id: string;
  type: string;
  message: string;
  amount?: number;
  timestamp: string;
}

interface Bubble {
  id: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  isBuy: boolean;
  isDevBuy: boolean;
  amount: number;
  createdAt: number;
}

function formatAmount(amount: number): string {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
  return amount.toFixed(0);
}

export function TransactionBubbles() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  const { data: activity } = useQuery<ActivityItem[]>({
    queryKey: ["/api/activity"],
    refetchInterval: 10000,
  });

  const createBubble = useCallback((item: ActivityItem) => {
    const isDevBuy = item.id.startsWith("devbuy-");
    const isBuy = item.message.toLowerCase().includes("buy");
    const amount = item.amount || 0;
    
    const sizeFactor = Math.min(Math.log10(amount + 1) / 6, 1);
    const baseSize = 40;
    const maxSize = 120;
    const size = baseSize + sizeFactor * (maxSize - baseSize);

    return {
      id: item.id + "-" + Date.now(),
      x: 10 + Math.random() * 80,
      y: 100 + Math.random() * 20,
      size,
      opacity: 0.8,
      speed: 0.5 + Math.random() * 1,
      isBuy,
      isDevBuy,
      amount,
      createdAt: Date.now(),
    };
  }, []);

  useEffect(() => {
    if (!activity || activity.length === 0) return;

    const newBubbles: Bubble[] = [];
    
    activity.forEach((item) => {
      if (!seenIds.has(item.id) && item.type === "trade") {
        newBubbles.push(createBubble(item));
        setSeenIds((prev) => {
          const next = new Set(prev);
          next.add(item.id);
          return next;
        });
      }
    });

    if (newBubbles.length > 0) {
      setBubbles((prev) => [...prev, ...newBubbles].slice(-15));
    }
  }, [activity, seenIds, createBubble]);

  useEffect(() => {
    const interval = setInterval(() => {
      setBubbles((prev) => {
        const now = Date.now();
        return prev
          .map((bubble) => ({
            ...bubble,
            y: bubble.y - bubble.speed,
            opacity: Math.max(0, bubble.opacity - 0.008),
          }))
          .filter((bubble) => bubble.opacity > 0 && now - bubble.createdAt < 12000);
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  if (bubbles.length === 0) return null;

  return (
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 5 }}
      aria-hidden="true"
      data-testid="transaction-bubbles"
    >
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className={`absolute flex items-center justify-center rounded-full transition-all duration-300 ${
            bubble.isDevBuy
              ? "bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary/50"
              : bubble.isBuy
              ? "bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30"
              : "bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30"
          }`}
          style={{
            left: `${bubble.x}%`,
            top: `${bubble.y}%`,
            width: bubble.size,
            height: bubble.size,
            opacity: bubble.opacity,
            transform: "translate(-50%, -50%)",
            boxShadow: bubble.isDevBuy
              ? "0 0 20px rgba(34, 197, 94, 0.4)"
              : bubble.isBuy
              ? "0 0 10px rgba(34, 197, 94, 0.2)"
              : "0 0 10px rgba(239, 68, 68, 0.2)",
          }}
          data-testid={`bubble-${bubble.id}`}
        >
          <div className="flex flex-col items-center gap-0.5">
            {bubble.isDevBuy ? (
              <Flame className="w-4 h-4 text-primary animate-pulse" />
            ) : bubble.isBuy ? (
              <ArrowUp className="w-3 h-3 text-green-400" />
            ) : (
              <ArrowDown className="w-3 h-3 text-red-400" />
            )}
            <span
              className={`font-mono text-xs font-bold ${
                bubble.isDevBuy
                  ? "text-primary"
                  : bubble.isBuy
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {formatAmount(bubble.amount)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
