import { db } from "./db";
import { priceHistory, apiCache } from "@shared/schema";
import { eq, desc, gt, and, sql } from "drizzle-orm";
import { NORMIE_TOKEN } from "@shared/schema";

const TOKEN_ADDRESS = NORMIE_TOKEN.address;
const DEXSCREENER_API = "https://api.dexscreener.com/latest/dex/tokens";

interface CachedData {
  data: any;
  etag?: string;
  lastModified?: Date;
  expiresAt?: Date;
}

interface FetchResult {
  data: any;
  fromCache: boolean;
  changed: boolean;
}

interface AdaptiveIntervals {
  highVolatility: number;
  mediumVolatility: number;
  lowVolatility: number;
  stale: number;
}

class SmartDataFetcher {
  private pollInterval: number = 30000;
  private adaptiveIntervals: AdaptiveIntervals = {
    highVolatility: 15000,
    mediumVolatility: 30000,
    lowVolatility: 60000,
    stale: 300000,
  };
  private lastPrices: Map<string, number> = new Map();

  async getFromCache(cacheKey: string): Promise<CachedData | null> {
    try {
      const result = await db
        .select()
        .from(apiCache)
        .where(eq(apiCache.cacheKey, cacheKey))
        .limit(1);

      if (result.length === 0) return null;

      const cached = result[0];
      return {
        data: JSON.parse(cached.data),
        etag: cached.etag || undefined,
        lastModified: cached.lastModified || undefined,
        expiresAt: cached.expiresAt || undefined,
      };
    } catch (error) {
      return null;
    }
  }

  isExpired(cached: CachedData): boolean {
    if (!cached.expiresAt) return true;
    return new Date() > cached.expiresAt;
  }

  async updateCacheExpiry(cacheKey: string): Promise<void> {
    const newExpiry = new Date(Date.now() + this.pollInterval);
    await db
      .update(apiCache)
      .set({ expiresAt: newExpiry })
      .where(eq(apiCache.cacheKey, cacheKey));
  }

  async saveToCache(
    cacheKey: string,
    data: any,
    etag?: string,
    lastModified?: Date
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + this.pollInterval);
    const dataStr = JSON.stringify(data);

    await db
      .insert(apiCache)
      .values({
        cacheKey,
        data: dataStr,
        etag,
        lastModified,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: apiCache.cacheKey,
        set: {
          data: dataStr,
          etag,
          lastModified,
          expiresAt,
        },
      });
  }

  hashCriticalFields(data: any): string {
    const critical = {
      price: data.priceUsd || data.price,
      volume: data.volume?.h24 || data.volume24h,
      marketCap: data.marketCap || data.fdv,
      liquidity: data.liquidity?.usd,
    };
    return JSON.stringify(critical);
  }

  detectChanges(oldData: any, newData: any): boolean {
    if (!oldData) return true;

    const oldHash = this.hashCriticalFields(oldData);
    const newHash = this.hashCriticalFields(newData);

    return oldHash !== newHash;
  }

  async saveToHistory(tokenAddress: string, data: any): Promise<void> {
    try {
      const price = parseFloat(data.priceUsd || data.price || "0");
      const volume24h = parseFloat(data.volume?.h24 || data.volume24h || "0");
      const marketCap = parseFloat(data.marketCap || data.fdv || "0");

      if (price > 0) {
        await db.insert(priceHistory).values({
          tokenAddress,
          price: price.toString(),
          volume24h: volume24h.toString(),
          marketCap: marketCap.toString(),
          source: "dexscreener",
          timestamp: new Date(),
        });

        this.lastPrices.set(tokenAddress, price);
      }
    } catch (error) {
      // Silently fail on history save errors
    }
  }

  async fetchWithChangeDetection(
    endpoint: string,
    cacheKey: string
  ): Promise<FetchResult> {
    const cached = await this.getFromCache(cacheKey);

    if (cached && !this.isExpired(cached)) {
      return { data: cached.data, fromCache: true, changed: false };
    }

    try {
      const headers: HeadersInit = {};
      if (cached?.etag) {
        headers["If-None-Match"] = cached.etag;
      }

      const response = await fetch(endpoint, { headers });

      if (response.status === 304 && cached) {
        await this.updateCacheExpiry(cacheKey);
        return { data: cached.data, fromCache: true, changed: false };
      }

      const newData = await response.json();
      const changed = this.detectChanges(cached?.data, newData);

      const etag = response.headers.get("etag") || undefined;
      const lastModifiedStr = response.headers.get("last-modified");
      const lastModified = lastModifiedStr
        ? new Date(lastModifiedStr)
        : undefined;

      await this.saveToCache(cacheKey, newData, etag, lastModified);

      return { data: newData, fromCache: false, changed };
    } catch (error) {
      if (cached) {
        return { data: cached.data, fromCache: true, changed: false };
      }
      throw error;
    }
  }

  async fetchTokenMetrics(): Promise<FetchResult> {
    const endpoint = `${DEXSCREENER_API}/${TOKEN_ADDRESS}`;
    const cacheKey = `token_metrics_${TOKEN_ADDRESS}`;

    const result = await this.fetchWithChangeDetection(endpoint, cacheKey);

    if (result.changed && result.data?.pairs?.[0]) {
      await this.saveToHistory(TOKEN_ADDRESS, result.data.pairs[0]);
    }

    return result;
  }

  async calculateVolatility(tokenAddress: string): Promise<number> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const recentPrices = await db
        .select({ price: priceHistory.price, timestamp: priceHistory.timestamp })
        .from(priceHistory)
        .where(
          and(
            eq(priceHistory.tokenAddress, tokenAddress),
            gt(priceHistory.timestamp, oneHourAgo)
          )
        )
        .orderBy(desc(priceHistory.timestamp))
        .limit(100);

      if (recentPrices.length < 2) return 0;

      const prices = recentPrices.map((p) => parseFloat(p.price));
      const changes: number[] = [];

      for (let i = 1; i < prices.length; i++) {
        const change = Math.abs(
          ((prices[i] - prices[i - 1]) / prices[i - 1]) * 100
        );
        changes.push(change);
      }

      return changes.reduce((a, b) => a + b, 0) / changes.length;
    } catch (error) {
      return 0;
    }
  }

  async determinePollInterval(tokenAddress: string): Promise<number> {
    const volatility = await this.calculateVolatility(tokenAddress);

    if (volatility > 10) return this.adaptiveIntervals.highVolatility;
    if (volatility > 5) return this.adaptiveIntervals.mediumVolatility;
    if (volatility > 1) return this.adaptiveIntervals.lowVolatility;
    return this.adaptiveIntervals.stale;
  }

  async getHistoricalPrices(
    tokenAddress: string,
    timeframe: string = "24h"
  ): Promise<any[]> {
    const intervals: Record<string, { interval: string; ago: number }> = {
      "1h": { interval: "1 minute", ago: 60 * 60 * 1000 },
      "24h": { interval: "5 minutes", ago: 24 * 60 * 60 * 1000 },
      "7d": { interval: "1 hour", ago: 7 * 24 * 60 * 60 * 1000 },
      "30d": { interval: "4 hours", ago: 30 * 24 * 60 * 60 * 1000 },
    };

    const config = intervals[timeframe] || intervals["24h"];
    const startTime = new Date(Date.now() - config.ago);

    try {
      const result = await db
        .select({
          timestamp: priceHistory.timestamp,
          price: priceHistory.price,
          volume: priceHistory.volume24h,
        })
        .from(priceHistory)
        .where(
          and(
            eq(priceHistory.tokenAddress, tokenAddress),
            gt(priceHistory.timestamp, startTime)
          )
        )
        .orderBy(priceHistory.timestamp);

      return result.map((row) => ({
        timestamp: row.timestamp.getTime(),
        price: parseFloat(row.price),
        volume: parseFloat(row.volume || "0"),
      }));
    } catch (error) {
      return [];
    }
  }

  async cleanupOldData(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date(
      Date.now() - daysToKeep * 24 * 60 * 60 * 1000
    );

    try {
      await db
        .delete(priceHistory)
        .where(
          sql`${priceHistory.timestamp} < ${cutoffDate}`
        );

      await db
        .delete(apiCache)
        .where(
          sql`${apiCache.expiresAt} < ${new Date()}`
        );
    } catch (error) {
      // Silently fail on cleanup errors
    }
  }

  getPollInterval(): number {
    return this.pollInterval;
  }

  setPollInterval(interval: number): void {
    this.pollInterval = interval;
  }
}

export const smartDataFetcher = new SmartDataFetcher();
export { SmartDataFetcher };
