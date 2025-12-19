import { useEffect, useRef } from "react";

interface MatrixRainProps {
  opacity?: number;
  speed?: number;
  density?: number;
}

export function MatrixRain({ opacity = 0.04, speed = 1, density = 0.5 }: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const chars = "NORMIE$01Nフミクチシナミテモウフウラロワムツサヌレヲネウケメラン";
    const charArray = chars.split("");
    const fontSize = 14;
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const columns = Math.floor(canvas.width / fontSize * density);
    const drops: number[] = [];
    const speeds: number[] = [];

    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100;
      speeds[i] = 0.5 + Math.random() * speed;
    }

    const draw = () => {
      ctx.fillStyle = `rgba(12, 17, 12, 0.05)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = `rgba(34, 197, 94, ${opacity})`;
      ctx.font = `${fontSize}px JetBrains Mono, monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = charArray[Math.floor(Math.random() * charArray.length)];
        const x = i * (fontSize / density);
        const y = drops[i] * fontSize;

        if (Math.random() > 0.95) {
          ctx.fillStyle = `rgba(74, 222, 128, ${opacity * 2.5})`;
        } else {
          ctx.fillStyle = `rgba(34, 197, 94, ${opacity})`;
        }

        ctx.fillText(char, x, y);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        drops[i] += speeds[i];
      }
    };

    const intervalId = setInterval(draw, 50);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [opacity, speed, density]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
      data-testid="matrix-rain-canvas"
    />
  );
}
