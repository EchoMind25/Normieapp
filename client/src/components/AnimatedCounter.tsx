import { useEffect, useState, useRef } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  onMilestone?: (value: number) => void;
  milestones?: number[];
}

export function AnimatedCounter({
  value,
  duration = 1000,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
  onMilestone,
  milestones = [],
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isIncreasing, setIsIncreasing] = useState(false);
  const prevValueRef = useRef(value);
  const animationRef = useRef<number | null>(null);
  const passedMilestonesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    const startTime = Date.now();

    setIsIncreasing(endValue > startValue);

    milestones.forEach((milestone) => {
      if (
        startValue < milestone &&
        endValue >= milestone &&
        !passedMilestonesRef.current.has(milestone)
      ) {
        passedMilestonesRef.current.add(milestone);
        onMilestone?.(milestone);
      }
    });

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const current = startValue + (endValue - startValue) * easeOut;
      setDisplayValue(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        prevValueRef.current = endValue;
        setIsIncreasing(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration, milestones, onMilestone]);

  const formatValue = (val: number): string => {
    return val.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <span
      className={`inline-flex items-center tabular-nums transition-colors duration-300 ${
        isIncreasing ? "text-green-400" : ""
      } ${className}`}
      data-testid="animated-counter"
    >
      {prefix}
      <span className={isIncreasing ? "animate-pulse" : ""}>
        {formatValue(displayValue)}
      </span>
      {suffix}
    </span>
  );
}
