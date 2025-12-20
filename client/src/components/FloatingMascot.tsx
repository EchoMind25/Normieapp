import { useState, useEffect, useRef, useCallback } from "react";
import { NormieMascot } from "./NormieMascot";
import { X } from "lucide-react";
import { useSoundEffects } from "@/components/SoundEffects";

interface FloatingMascotProps {
  priceChange?: number;
  devBuys?: Array<{ amount: number; timestamp: number; signature: string }>;
  activity?: Array<{ id: string; type: string; message: string; amount?: number; timestamp: string }>;
}

type AlertType = "whale" | "jeet" | "idle" | "random";

interface SpeechBubble {
  message: string;
  type: AlertType;
  timestamp: number;
}

const WHALE_THRESHOLD = 2_000_000;
const JEET_THRESHOLD = 5_000_000;
const AUTO_DISMISS_MS = 8000;
const RANDOM_MESSAGE_INTERVAL_MS = 45000;

const idleMessages = [
  "GM normies!",
  "Still holding? Based.",
  "Wagmi fren",
  "Comfy vibes only",
  "Diamond hands never fold",
  "LFG normie nation!",
  "Who's buying the dip?",
  "Stay based, stay normie",
  "This is the way",
  "Patience pays, normie",
  "Checking the charts...",
  "Wen moon? Soon.",
  "Just normie things",
  "HODL gang rise up",
  "Another day, another normie",
];

const whaleMessages = [
  "WHALE ALERT! Big money entering!",
  "Someone just went FULL SEND!",
  "Mega bag incoming!",
  "Whale spotted! LFG!",
  "Big player has entered the chat!",
  "That's a whale-sized buy!",
  "Smart money is buying!",
  "MASSIVE buy detected!",
  "Whale is accumulating!",
  "Now THAT'S a position!",
];

const jeetMessages = [
  "JEET ALARM! Paper hands detected!",
  "Someone just paper handed!",
  "Weak hands selling...",
  "NGMI detected!",
  "Jeet spotted! Bye bye!",
  "Paper hands folded!",
  "Sellers gonna sell...",
  "Shake out the weak hands!",
  "More for us diamond hands!",
  "Thanks for the cheap tokens!",
];

export function FloatingMascot({ priceChange = 0, devBuys = [], activity = [] }: FloatingMascotProps) {
  const [speechBubble, setSpeechBubble] = useState<SpeechBubble | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const randomMessageIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processedSignaturesRef = useRef<Set<string>>(new Set());
  const { playSound } = useSoundEffects();

  const showMessage = useCallback((message: string, type: AlertType) => {
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
    }

    setSpeechBubble({
      message,
      type,
      timestamp: Date.now(),
    });

    dismissTimeoutRef.current = setTimeout(() => {
      setSpeechBubble(null);
    }, AUTO_DISMISS_MS);
  }, []);

  const showRandomMessage = useCallback(() => {
    if (speechBubble?.type === "whale" || speechBubble?.type === "jeet") {
      return;
    }
    const message = idleMessages[Math.floor(Math.random() * idleMessages.length)];
    showMessage(message, "random");
  }, [showMessage, speechBubble?.type]);

  useEffect(() => {
    const delay = setTimeout(() => {
      showRandomMessage();
    }, 5000);

    randomMessageIntervalRef.current = setInterval(() => {
      showRandomMessage();
    }, RANDOM_MESSAGE_INTERVAL_MS);

    return () => {
      clearTimeout(delay);
      if (randomMessageIntervalRef.current) {
        clearInterval(randomMessageIntervalRef.current);
      }
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }
    };
  }, [showRandomMessage]);

  useEffect(() => {
    if (!devBuys || devBuys.length === 0) return;

    for (const buy of devBuys) {
      if (processedSignaturesRef.current.has(buy.signature)) continue;

      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      if (buy.timestamp < fiveMinutesAgo) {
        processedSignaturesRef.current.add(buy.signature);
        continue;
      }

      processedSignaturesRef.current.add(buy.signature);

      if (buy.amount >= WHALE_THRESHOLD) {
        const message = whaleMessages[Math.floor(Math.random() * whaleMessages.length)];
        const formattedAmount = (buy.amount / 1_000_000).toFixed(2);
        showMessage(`${message} (${formattedAmount}M $NORMIE)`, "whale");
        playSound("milestone");
      }
    }
  }, [devBuys, showMessage, playSound]);

  useEffect(() => {
    if (!activity || activity.length === 0) return;

    for (const item of activity) {
      if (processedSignaturesRef.current.has(item.id)) continue;

      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const itemTime = new Date(item.timestamp).getTime();
      if (itemTime < fiveMinutesAgo) {
        processedSignaturesRef.current.add(item.id);
        continue;
      }

      processedSignaturesRef.current.add(item.id);

      if (item.amount && item.amount < 0) {
        const soldAmount = Math.abs(item.amount);
        if (soldAmount >= JEET_THRESHOLD) {
          const message = jeetMessages[Math.floor(Math.random() * jeetMessages.length)];
          const formattedAmount = (soldAmount / 1_000_000).toFixed(2);
          showMessage(`${message} (${formattedAmount}M $NORMIE sold)`, "jeet");
          playSound("dump");
        }
      } else if (item.amount && item.amount >= WHALE_THRESHOLD) {
        if (!item.message?.includes("WHALE")) return;
        const message = whaleMessages[Math.floor(Math.random() * whaleMessages.length)];
        const formattedAmount = (item.amount / 1_000_000).toFixed(2);
        showMessage(`${message} (${formattedAmount}M $NORMIE)`, "whale");
        playSound("milestone");
      }
    }
  }, [activity, showMessage, playSound]);

  const dismissBubble = useCallback(() => {
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }
    setSpeechBubble(null);
    
    // Reset random message timer after dismiss to ensure proper 8s timing
    if (randomMessageIntervalRef.current) {
      clearInterval(randomMessageIntervalRef.current);
      randomMessageIntervalRef.current = setInterval(() => {
        showRandomMessage();
      }, RANDOM_MESSAGE_INTERVAL_MS);
    }
  }, [showRandomMessage]);

  const handleMascotClick = useCallback(() => {
    if (!speechBubble) {
      const message = idleMessages[Math.floor(Math.random() * idleMessages.length)];
      showMessage(message, "idle");
    }
  }, [speechBubble, showMessage]);

  const getBubbleStyles = () => {
    switch (speechBubble?.type) {
      case "whale":
        return "bg-primary border-primary text-primary-foreground shadow-xl";
      case "jeet":
        return "bg-destructive border-destructive text-destructive-foreground shadow-xl";
      default:
        return "bg-card border-2 border-primary/30 text-card-foreground shadow-lg";
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed bottom-20 right-4 z-50 md:bottom-4 flex flex-col items-end gap-2"
      data-testid="floating-mascot-container"
    >
      {speechBubble && (
        <div
          className={`relative max-w-[240px] p-3 rounded-lg border-2 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300 ${getBubbleStyles()}`}
          data-testid="speech-bubble"
        >
          <button
            onClick={dismissBubble}
            className="absolute -top-2 -right-2 p-1 rounded-full bg-muted hover:bg-muted/80 border border-border"
            data-testid="button-dismiss-bubble"
            aria-label="Dismiss message"
          >
            <X className="w-3 h-3" />
          </button>
          
          <p className="text-sm font-mono leading-relaxed pr-2">
            {speechBubble.message}
          </p>
          
          {(speechBubble.type === "whale" || speechBubble.type === "jeet") && (
            <div className="mt-2 flex items-center gap-1">
              {speechBubble.type === "whale" ? (
                <span className="text-xs font-bold animate-pulse">WHALE ALERT</span>
              ) : (
                <span className="text-xs font-bold animate-pulse">JEET ALARM</span>
              )}
            </div>
          )}
          
          <div 
            className={`absolute -bottom-2 right-6 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent ${
              speechBubble.type === "whale" 
                ? "border-t-primary" 
                : speechBubble.type === "jeet"
                ? "border-t-destructive"
                : "border-t-card"
            }`}
          />
        </div>
      )}
      
      <button
        type="button"
        onClick={handleMascotClick}
        className="cursor-pointer"
        data-testid="button-mascot-interact"
        aria-label="Click to interact with Normie mascot"
      >
        <NormieMascot
          priceChange={priceChange}
          className="w-16 h-16 sm:w-20 sm:h-20"
        />
      </button>
    </div>
  );
}
