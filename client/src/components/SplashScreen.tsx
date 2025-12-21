import { useState, useEffect } from "react";
import normieLogoPath from "@assets/Normie-Favicon_1766311150538.png";

interface SplashScreenProps {
  onComplete?: () => void;
  minDuration?: number;
}

export function SplashScreen({ onComplete, minDuration = 1500 }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 300);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-300 ${
        isExiting ? "opacity-0" : "opacity-100"
      }`}
      style={{ backgroundColor: "#AA3D1D" }}
      data-testid="splash-screen"
    >
      <div className="flex flex-col items-center gap-6">
        <img
          src={normieLogoPath}
          alt="Normie"
          className="w-48 h-48 animate-pulse"
        />
        <div className="text-center">
          <h1 className="text-white font-mono text-2xl font-bold tracking-wider">
            NORMIE OBSERVER
          </h1>
          <p className="text-white/70 font-mono text-sm mt-2">
            Built Different
          </p>
        </div>
        <div className="flex gap-1 mt-4">
          <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}
