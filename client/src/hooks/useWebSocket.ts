import { useState, useEffect, useRef, useCallback } from "react";
import type { TokenMetrics, PricePoint, DevBuy } from "@shared/schema";

export function useWebSocket() {
  const [metrics, setMetrics] = useState<TokenMetrics | null>(null);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [devBuys, setDevBuys] = useState<DevBuy[]>([]);
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
      }
    }
  }, []);

  const fetchPriceHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/price-history", {
        headers: { "Cache-Control": "no-cache" },
      });
      if (response.status === 304) return;
      if (!response.ok) throw new Error("Failed to fetch price history");
      
      const data = await response.json();
      if (mountedRef.current && Array.isArray(data) && data.length > 0) {
        hasReceivedDataRef.current = true;
        setPriceHistory(data);
      }
    } catch (error) {
      console.error("[Polling] Price history fetch error:", error);
    }
  }, [priceHistory.length]);

  const fetchDevBuys = useCallback(async () => {
    try {
      const response = await fetch("/api/dev-buys", {
        headers: { "Cache-Control": "no-cache" },
      });
      if (response.status === 304) return;
      if (!response.ok) throw new Error("Failed to fetch dev buys");
      
      const data = await response.json();
      if (mountedRef.current && Array.isArray(data)) {
        setDevBuys(data);
      }
    } catch (error) {
      console.error("[Polling] Dev buys fetch error:", error);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    
    fetchMetrics();
    fetchPriceHistory();
    fetchDevBuys();
    
    const metricsInterval = setInterval(fetchMetrics, 5000);
    const historyInterval = setInterval(fetchPriceHistory, 30000);
    const devBuysInterval = setInterval(fetchDevBuys, 60000);
    
    const fallbackTimer = setTimeout(() => {
      if (!hasReceivedDataRef.current && mountedRef.current) {
        setIsLoading(false);
      }
    }, 10000);

    return () => {
      mountedRef.current = false;
      clearInterval(metricsInterval);
      clearInterval(historyInterval);
      clearInterval(devBuysInterval);
      clearTimeout(fallbackTimer);
    };
  }, [fetchMetrics, fetchPriceHistory, fetchDevBuys]);

  return {
    metrics,
    priceHistory,
    devBuys,
    isConnected,
    isLoading,
  };
}
