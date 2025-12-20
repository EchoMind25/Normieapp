import { useEffect, useState, useCallback } from "react";

interface EasterEggsProps {
  onKonamiCode?: () => void;
  onSecretUnlocked?: (secret: string) => void;
}

const KONAMI_CODE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "KeyB",
  "KeyA",
];

export function EasterEggs({ onKonamiCode, onSecretUnlocked }: EasterEggsProps) {
  const [keySequence, setKeySequence] = useState<string[]>([]);
  const [showSecret, setShowSecret] = useState(false);
  const [secretMessage, setSecretMessage] = useState("");

  const checkKonamiCode = useCallback((sequence: string[]) => {
    const konamiMatch = KONAMI_CODE.every((key, i) => sequence[sequence.length - KONAMI_CODE.length + i] === key);
    
    if (konamiMatch && sequence.length >= KONAMI_CODE.length) {
      setSecretMessage("DIAMOND HANDS MODE ACTIVATED");
      setShowSecret(true);
      onKonamiCode?.();
      onSecretUnlocked?.("konami");
      
      setTimeout(() => setShowSecret(false), 3000);
      return true;
    }
    return false;
  }, [onKonamiCode, onSecretUnlocked]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.code;
      
      setKeySequence((prev) => {
        const newSequence = [...prev.slice(-15), key];
        checkKonamiCode(newSequence);
        return newSequence;
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [checkKonamiCode]);

  if (!showSecret) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none flex items-center justify-center"
      style={{ zIndex: 200 }}
      data-testid="easter-egg-reveal"
    >
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse" />
        <div className="relative bg-background/95 border-2 border-primary rounded-lg px-12 py-8 text-center animate-bounce">
          <div className="text-6xl mb-4">
            <svg viewBox="0 0 100 80" className="w-24 h-24 mx-auto">
              <polygon
                points="50,5 20,75 50,60 80,75"
                fill="none"
                stroke="hsl(180, 70%, 50%)"
                strokeWidth="3"
                className="animate-pulse"
              />
              <polygon
                points="50,20 35,55 50,45 65,55"
                fill="hsl(180, 70%, 50%)"
                opacity="0.5"
              />
            </svg>
          </div>
          <p className="text-2xl font-bold font-mono text-primary animate-pulse">
            {secretMessage}
          </p>
          <p className="text-sm text-muted-foreground mt-2 font-mono">
            You are now a true NORMIE
          </p>
        </div>
      </div>
    </div>
  );
}
