import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SoundContextType {
  isMuted: boolean;
  toggleMute: () => void;
  playSound: (type: SoundType) => void;
}

type SoundType = "pump" | "dump" | "milestone" | "trade" | "notification";

const SoundContext = createContext<SoundContextType | null>(null);

export function useSoundEffects() {
  const context = useContext(SoundContext);
  if (!context) {
    return {
      isMuted: true,
      toggleMute: () => {},
      playSound: () => {},
    };
  }
  return context;
}

interface SoundProviderProps {
  children: React.ReactNode;
}

export function SoundProvider({ children }: SoundProviderProps) {
  const [isMuted, setIsMuted] = useState(() => {
    const stored = localStorage.getItem("normie-sound-muted");
    return stored === null ? true : stored === "true";
  });
  
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    localStorage.setItem("normie-sound-muted", String(isMuted));
  }, [isMuted]);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = "sine", volume: number = 0.1) => {
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio playback failed silently
    }
  }, [getAudioContext]);

  const playSound = useCallback((type: SoundType) => {
    if (isMuted) return;

    switch (type) {
      case "pump":
        playTone(523.25, 0.15, "sine", 0.08);
        setTimeout(() => playTone(659.25, 0.15, "sine", 0.08), 100);
        setTimeout(() => playTone(783.99, 0.2, "sine", 0.1), 200);
        break;
      case "dump":
        playTone(392, 0.15, "sine", 0.06);
        setTimeout(() => playTone(311.13, 0.15, "sine", 0.06), 100);
        setTimeout(() => playTone(261.63, 0.2, "sine", 0.08), 200);
        break;
      case "milestone":
        playTone(523.25, 0.1, "sine", 0.1);
        setTimeout(() => playTone(659.25, 0.1, "sine", 0.1), 80);
        setTimeout(() => playTone(783.99, 0.1, "sine", 0.1), 160);
        setTimeout(() => playTone(1046.5, 0.3, "sine", 0.12), 240);
        break;
      case "trade":
        playTone(880, 0.08, "sine", 0.04);
        break;
      case "notification":
        playTone(440, 0.1, "sine", 0.06);
        setTimeout(() => playTone(554.37, 0.15, "sine", 0.06), 100);
        break;
    }
  }, [isMuted, playTone]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  return (
    <SoundContext.Provider value={{ isMuted, toggleMute, playSound }}>
      {children}
    </SoundContext.Provider>
  );
}

export function SoundToggle() {
  const { isMuted, toggleMute } = useSoundEffects();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleMute}
      title={isMuted ? "Unmute sounds" : "Mute sounds"}
      data-testid="button-sound-toggle"
    >
      {isMuted ? (
        <VolumeX className="h-5 w-5" />
      ) : (
        <Volume2 className="h-5 w-5 text-primary" />
      )}
    </Button>
  );
}
