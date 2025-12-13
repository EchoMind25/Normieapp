import { useState, useEffect, useRef, useCallback } from "react";
import type { TokenMetrics, PricePoint } from "@shared/schema";
import { FALLBACK_METRICS } from "@shared/schema";

function generateFallbackPriceHistory(): PricePoint[] {
  const now = Date.now();
  const points: PricePoint[] = [];
  const basePrice = FALLBACK_METRICS.price;
  
  for (let i = 23; i >= 0; i--) {
    const timestamp = now - i * 60 * 60 * 1000;
    const variance = (Math.random() - 0.5) * 0.00002;
    points.push({
      timestamp,
      price: basePrice + variance,
      volume: Math.random() * 1000 + 500,
    });
  }
  
  return points;
}

export function useWebSocket() {
  const [metrics, setMetrics] = useState<TokenMetrics | null>(null);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const mountedRef = useRef(true);
  const hasReceivedDataRef = useRef(false);

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch("/api/metrics");
      if (!response.ok) throw new Error("Failed to fetch metrics");
      
      const data = await response.json();
      if (mountedRef.current) {
        hasReceivedDataRef.current = true;
        setMetrics(data);
        setIsConnected(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("[Polling] Metrics fetch error:", error);
      if (mountedRef.current) {
        setIsConnected(false);
        if (!hasReceivedDataRef.current) {
          setMetrics(FALLBACK_METRICS);
          setIsLoading(false);
        }
      }
    }
  }, []);

  const fetchPriceHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/price-history");
      if (!response.ok) throw new Error("Failed to fetch price history");
      
      const data = await response.json();
      if (mountedRef.current && Array.isArray(data) && data.length > 0) {
        hasReceivedDataRef.current = true;
        setPriceHistory(data);
      }
    } catch (error) {
      console.error("[Polling] Price history fetch error:", error);
      if (mountedRef.current && priceHistory.length === 0) {
        setPriceHistory(generateFallbackPriceHistory());
      }
    }
  }, [priceHistory.length]);

  useEffect(() => {
    mountedRef.current = true;
    
    fetchMetrics();
    fetchPriceHistory();
    
    const metricsInterval = setInterval(fetchMetrics, 5000);
    const historyInterval = setInterval(fetchPriceHistory, 30000);
    
    const fallbackTimer = setTimeout(() => {
      if (!hasReceivedDataRef.current && mountedRef.current) {
        setIsLoading(false);
        setMetrics(FALLBACK_METRICS);
        setPriceHistory(generateFallbackPriceHistory());
      }
    }, 5000);

    return () => {
      mountedRef.current = false;
      clearInterval(metricsInterval);
      clearInterval(historyInterval);
      clearTimeout(fallbackTimer);
    };
  }, [fetchMetrics, fetchPriceHistory]);

  return {
    metrics,
    priceHistory,
    isConnected,
    isLoading,
  };
}
