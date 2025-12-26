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
  
  const etagsRef = useRef<Record<string, string>>({});

  const fetchWithETag = useCallback(async (url: string): Promise<{ data: unknown; notModified: boolean }> => {
    const headers: HeadersInit = {};
    const cachedEtag = etagsRef.current[url];
    if (cachedEtag) {
      headers["If-None-Match"] = cachedEtag;
    }
    
    const response = await fetch(url, { headers });
    
    if (response.status === 304) {
      return { data: null, notModified: true };
    }
    
    const newEtag = response.headers.get("ETag");
    if (newEtag) {
      etagsRef.current[url] = newEtag;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}`);
    }
    
    return { data: await response.json(), notModified: false };
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const { data, notModified } = await fetchWithETag("/api/metrics");
      if (notModified) return;
      
      if (mountedRef.current && data) {
        hasReceivedDataRef.current = true;
        setMetrics(data as TokenMetrics);
        setIsConnected(true);
        setIsLoading(false);
      }
    } catch (error) {
      if (mountedRef.current) {
        setIsConnected(false);
      }
    }
  }, [fetchWithETag]);

  const fetchPriceHistory = useCallback(async () => {
    try {
      const { data, notModified } = await fetchWithETag("/api/price-history");
      if (notModified) return;
      
      if (mountedRef.current && Array.isArray(data) && data.length > 0) {
        hasReceivedDataRef.current = true;
        setPriceHistory(data);
      }
    } catch (error) {
      // Price history fetch failed silently
    }
  }, [fetchWithETag]);

  const fetchDevBuys = useCallback(async () => {
    try {
      const { data, notModified } = await fetchWithETag("/api/dev-buys");
      if (notModified) return;
      
      if (mountedRef.current && Array.isArray(data)) {
        setDevBuys(data);
      }
    } catch (error) {
      // Dev buys fetch failed silently
    }
  }, [fetchWithETag]);

  const fetchActivity = useCallback(async () => {
    try {
      const { data, notModified } = await fetchWithETag("/api/activity");
      if (notModified) return;
      
      if (mountedRef.current && Array.isArray(data)) {
        setActivity(data);
      }
    } catch (error) {
      // Activity fetch failed silently
    }
  }, [fetchWithETag]);

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
