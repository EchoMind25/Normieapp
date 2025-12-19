import { useState, useEffect, useRef, useCallback } from "react";
import type { TokenMetrics, PricePoint, DevBuy, ActivityItem } from "@shared/schema";

export function useWebSocket() {
  const [metrics, setMetrics] = useState<TokenMetrics | null>(null);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [devBuys, setDevBuys] = useState<DevBuy[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const mountedRef = useRef(true);
  const hasReceivedDataRef = useRef(false);

  const fetchMetrics = useCallback(async () => {
    try {
      console.log("[NORMIE] Fetching metrics...");
      const response = await fetch("/api/metrics", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (response.status === 304) {
        console.log("[NORMIE] 304 response, skipping");
        return;
      }
      if (!response.ok) throw new Error("Failed to fetch metrics");
      
      const data = await response.json();
      console.log("[NORMIE] Got metrics:", data.price, data.marketCap, data.lastUpdated);
      if (mountedRef.current) {
        hasReceivedDataRef.current = true;
        setMetrics(data);
        setIsConnected(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("[NORMIE] Metrics fetch error:", error);
      if (mountedRef.current) {
        setIsConnected(false);
      }
    }
  }, []);

  const fetchPriceHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/price-history", {
        cache: "no-store",
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
  }, []);

  const fetchDevBuys = useCallback(async () => {
    try {
      const response = await fetch("/api/dev-buys", {
        cache: "no-store",
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

  const fetchActivity = useCallback(async () => {
    try {
      const response = await fetch("/api/activity", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (response.status === 304) return;
      if (!response.ok) throw new Error("Failed to fetch activity");
      
      const data = await response.json();
      if (mountedRef.current && Array.isArray(data)) {
        setActivity(data);
      }
    } catch (error) {
      console.error("[Polling] Activity fetch error:", error);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    
    fetchMetrics();
    fetchPriceHistory();
    fetchDevBuys();
    fetchActivity();
    
    const metricsInterval = setInterval(fetchMetrics, 5000);
    const historyInterval = setInterval(fetchPriceHistory, 30000);
    const devBuysInterval = setInterval(fetchDevBuys, 60000);
    const activityInterval = setInterval(fetchActivity, 15000);
    
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
      clearInterval(activityInterval);
      clearTimeout(fallbackTimer);
    };
  }, [fetchMetrics, fetchPriceHistory, fetchDevBuys, fetchActivity]);

  return {
    metrics,
    priceHistory,
    devBuys,
    activity,
    isConnected,
    isLoading,
  };
}
