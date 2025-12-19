import { useEffect, useState, useCallback } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

interface ConfettiCelebrationProps {
  trigger: boolean;
  message?: string;
  onComplete?: () => void;
}

const COLORS = [
  "hsl(142, 72%, 45%)",
  "hsl(142, 72%, 55%)",
  "hsl(142, 72%, 65%)",
  "hsl(45, 90%, 50%)",
  "hsl(180, 70%, 45%)",
];

export function ConfettiCelebration({ trigger, message, onComplete }: ConfettiCelebrationProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showMessage, setShowMessage] = useState(false);

  const createParticles = useCallback(() => {
    const newParticles: Particle[] = [];
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 3;

    for (let i = 0; i < 100; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const velocity = 5 + Math.random() * 10;

      newParticles.push({
        id: i,
        x: centerX,
        y: centerY,
        size: 8 + Math.random() * 8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        speedX: Math.cos(angle) * velocity,
        speedY: Math.sin(angle) * velocity - 5,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 20,
        opacity: 1,
      });
    }

    return newParticles;
  }, []);

  useEffect(() => {
    if (!trigger) return;

    setParticles(createParticles());
    setShowMessage(true);

    const messageTimer = setTimeout(() => setShowMessage(false), 2500);

    const interval = setInterval(() => {
      setParticles((prev) => {
        const updated = prev
          .map((p) => ({
            ...p,
            x: p.x + p.speedX,
            y: p.y + p.speedY,
            speedY: p.speedY + 0.3,
            speedX: p.speedX * 0.99,
            rotation: p.rotation + p.rotationSpeed,
            opacity: p.opacity - 0.015,
          }))
          .filter((p) => p.opacity > 0 && p.y < window.innerHeight + 100);

        if (updated.length === 0) {
          clearInterval(interval);
          onComplete?.();
        }

        return updated;
      });
    }, 16);

    return () => {
      clearInterval(interval);
      clearTimeout(messageTimer);
    };
  }, [trigger, createParticles, onComplete]);

  if (particles.length === 0 && !showMessage) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 100 }}
      aria-hidden="true"
      data-testid="confetti-celebration"
    >
      {showMessage && message && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center animate-bounce">
          <div className="bg-primary/90 text-primary-foreground px-8 py-4 rounded-lg font-bold text-2xl font-mono shadow-lg glow-primary">
            {message}
          </div>
        </div>
      )}

      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            opacity: particle.opacity,
            transform: `rotate(${particle.rotation}deg)`,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          }}
        />
      ))}
    </div>
  );
}
