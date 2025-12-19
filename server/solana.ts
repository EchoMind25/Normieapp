import { Connection, PublicKey } from "@solana/web3.js";
import { NORMIE_TOKEN } from "@shared/schema";
import type { TokenMetrics, PricePoint, DevBuy, ActivityItem } from "@shared/schema";
import { fetchStreamflowLockedTokens, getLockedTokens } from "./streamflow";

const RPC_ENDPOINT = "https://solana-rpc.publicnode.com";
const DEXSCREENER_API = "https://api.dexscreener.com/latest/dex/tokens";
const BIRDEYE_API = "https://public-api.birdeye.so";
const TOKEN_ADDRESS = NORMIE_TOKEN.address;
const DEV_WALLET = "8eQ8axmX7hwWdMxpq5KcqnTwMZyxjAzo7fc5sEdvj2EB";
const BURN_ADDRESS = "1nc1nerator11111111111111111111111111111111";
const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY || "";

// Per dev (@NormieCEO) on X: OVER 527 million burned/locked total
// Burned + Locked combined = 527M+ (shown as "Supply Stranglehold")
const BURNED_TOKENS: number = 297000000;  // ~297M burned
// Locked tokens now fetched from Streamflow (fallback: 230M)
let cachedBurnedTokens: number = BURNED_TOKENS;

let connection: Connection | null = null;
let priceHistory: PricePoint[] = [];
let historicalPriceData: Map<string, PricePoint[]> = new Map();
let devBuys: DevBuy[] = [];
let currentMetrics: TokenMetrics | null = null;
let lastRpcSuccess = Date.now();
let lastDexScreenerFetch = 0;
let lastHistoricalFetch = 0;

// Activity cache for real-time token activity tracking
let activityCache: ActivityItem[] = [];
let lastActivityFetch = 0;
const ACTIVITY_CACHE_TTL = 60000; // 60 seconds

function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(RPC_ENDPOINT, "confirmed");
  }
  return connection;
}

async function fetchBurnedTokens(): Promise<number> {
  // Return confirmed burn amount - 527M+ burned by dev
  // Solana RPC getTokenSupply doesn't accurately reflect pump.fun burn mechanisms
  console.log(`[Solana] Using confirmed burn data - Burned: ${formatBurnedTokens(cachedBurnedTokens)} tokens`);
  return cachedBurnedTokens;
}

function formatBurnedTokens(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
  return num.toString();
}

export async function fetchTokenMetrics(): Promise<TokenMetrics> {
  const now = Date.now();
  
  if (currentMetrics && now - lastDexScreenerFetch < 5000) {
    return currentMetrics;
  }
  
  try {
    // Fetch DexScreener data, burned tokens, and Streamflow locked tokens in parallel
    const [response, burnedTokens, lockedTokens] = await Promise.all([
      fetch(`${DEXSCREENER_API}/${TOKEN_ADDRESS}`),
      fetchBurnedTokens(),
      fetchStreamflowLockedTokens(),
    ]);
    
    if (!response.ok) {
      throw new Error(`DexScreener API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.pairs && data.pairs.length > 0) {
      const pair = data.pairs[0];
      lastDexScreenerFetch = now;
      lastRpcSuccess = now;
      
      const price = parseFloat(pair.priceUsd) || 0;
      const marketCap = pair.marketCap || pair.fdv || 0;
      const volume24h = pair.volume?.h24 || 0;
      const liquidity = pair.liquidity?.usd || 0;
      const priceChange24h = pair.priceChange?.h24 || 0;
      
      const totalSupply = 1000000000;
      const circulatingSupply = totalSupply - burnedTokens - lockedTokens;
      
      console.log(`[DexScreener] Fetched real data - Price: $${price.toFixed(8)}, MCap: $${marketCap}, Burned: ${formatBurnedTokens(burnedTokens)}, Locked: ${formatBurnedTokens(lockedTokens)}`);
      
      currentMetrics = {
        price,
        priceChange24h,
        marketCap,
        marketCapChange24h: priceChange24h,
        volume24h,
        liquidity,
        totalSupply,
        circulatingSupply,
        burnedTokens,
        lockedTokens,
        holders: 0,
        lastUpdated: new Date().toISOString(),
      };
      
      return currentMetrics;
    }
    
    throw new Error("No pairs found in DexScreener response");
  } catch (error) {
    console.error("[DexScreener] Error fetching metrics:", error);
    
    if (currentMetrics) {
      return currentMetrics;
    }
    
    return {
      price: 0,
      priceChange24h: 0,
      marketCap: 0,
      marketCapChange24h: 0,
      volume24h: 0,
      liquidity: 0,
      totalSupply: 1000000000,
      circulatingSupply: 1000000000,
      burnedTokens: cachedBurnedTokens,
      lockedTokens: getLockedTokens(),
      holders: 0,
      lastUpdated: new Date().toISOString(),
    };
  }
}

export async function fetchDevBuys(): Promise<DevBuy[]> {
  try {
    const conn = getConnection();
    const devPubkey = new PublicKey(DEV_WALLET);
    
    const signatures = await conn.getSignaturesForAddress(devPubkey, { limit: 50 });
    
    if (signatures.length > 0) {
      console.log(`[Solana] Found ${signatures.length} dev wallet transactions`);
      
      const recentBuys: DevBuy[] = [];
      
      for (const sig of signatures.slice(0, 10)) {
        if (!sig.blockTime) continue;
        
        try {
          const tx = await conn.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });
          
          if (tx && tx.meta && !tx.meta.err) {
            const preBalances = tx.meta.preBalances || [];
            const postBalances = tx.meta.postBalances || [];
            
            if (postBalances[0] < preBalances[0]) {
              const solSpent = (preBalances[0] - postBalances[0]) / 1e9;
              
              if (solSpent > 0.01) {
                recentBuys.push({
                  signature: sig.signature,
                  timestamp: sig.blockTime * 1000,
                  amount: solSpent * 1000000,
                  price: currentMetrics?.price || 0,
                });
              }
            }
          }
        } catch (txError) {
          console.error(`[Solana] Error parsing tx ${sig.signature}:`, txError);
        }
      }
      
      if (recentBuys.length > 0) {
        devBuys = recentBuys;
        console.log(`[Solana] Identified ${recentBuys.length} dev buys`);
      }
    }
  } catch (error) {
    console.error("[Solana] Error fetching dev buys:", error);
  }
  
  return devBuys;
}

export function getMetrics(): TokenMetrics | null {
  return currentMetrics;
}

export function getDevBuys(): DevBuy[] {
  return devBuys;
}

export function addPricePoint(metrics: TokenMetrics): void {
  if (metrics.price <= 0) return;
  
  const point: PricePoint = {
    timestamp: Date.now(),
    price: metrics.price,
    volume: metrics.volume24h / 24,
  };
  
  priceHistory.push(point);
  
  if (priceHistory.length > 288) {
    priceHistory = priceHistory.slice(-288);
  }
}

export function getPriceHistory(): PricePoint[] {
  return priceHistory;
}

export function getConnectionStatus(): { isConnected: boolean; lastSuccess: number } {
  const timeSinceLastSuccess = Date.now() - lastRpcSuccess;
  return {
    isConnected: timeSinceLastSuccess < 30000,
    lastSuccess: lastRpcSuccess,
  };
}

// Fetch real OHLCV data from Birdeye API
async function fetchBirdeyeOHLCV(timeRange: string): Promise<PricePoint[] | null> {
  if (!BIRDEYE_API_KEY) {
    console.log("[Birdeye] No API key configured");
    return null;
  }
  
  const now = Math.floor(Date.now() / 1000);
  
  // Map time ranges to Birdeye interval types and durations
  const rangeConfig: Record<string, { type: string; duration: number }> = {
    "5m": { type: "1m", duration: 5 * 60 },
    "1h": { type: "1m", duration: 60 * 60 },
    "6h": { type: "5m", duration: 6 * 60 * 60 },
    "24h": { type: "15m", duration: 24 * 60 * 60 },
    "7d": { type: "1H", duration: 7 * 24 * 60 * 60 },
  };
  
  const config = rangeConfig[timeRange] || rangeConfig["1h"];
  const timeFrom = now - config.duration;
  
  try {
    const url = `${BIRDEYE_API}/defi/ohlcv?address=${TOKEN_ADDRESS}&type=${config.type}&time_from=${timeFrom}&time_to=${now}`;
    
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "X-API-KEY": BIRDEYE_API_KEY,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Birdeye] API error ${response.status}: ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.success || !data.data?.items || data.data.items.length === 0) {
      console.log("[Birdeye] No OHLCV data returned");
      return null;
    }
    
    const points: PricePoint[] = data.data.items.map((item: any) => ({
      timestamp: item.unixTime * 1000,
      price: item.c || item.close || 0, // Close price
      volume: item.v || item.volume || 0,
    }));
    
    console.log(`[Birdeye] Fetched ${points.length} real OHLCV points for ${timeRange} range`);
    return points;
  } catch (error) {
    console.error("[Birdeye] Error fetching OHLCV:", error);
    return null;
  }
}

// Fallback: Generate simulated prices from DexScreener price changes
async function fetchDexScreenerSimulatedPrices(timeRange: string): Promise<PricePoint[]> {
  const now = Date.now();
  
  const response = await fetch(`${DEXSCREENER_API}/${TOKEN_ADDRESS}`);
  
  if (!response.ok) {
    throw new Error(`DexScreener API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.pairs || data.pairs.length === 0) {
    throw new Error("No pairs found");
  }
  
  const pair = data.pairs[0];
  const currentPrice = parseFloat(pair.priceUsd) || 0;
  const priceChange24h = pair.priceChange?.h24 || 0;
  const priceChange6h = pair.priceChange?.h6 || 0;
  const priceChange1h = pair.priceChange?.h1 || 0;
  
  const points: PricePoint[] = [];
  const volume24h = pair.volume?.h24 || 0;
  
  const price1hAgo = currentPrice / (1 + priceChange1h / 100);
  const price6hAgo = currentPrice / (1 + priceChange6h / 100);
  const price24hAgo = currentPrice / (1 + priceChange24h / 100);
  
  const rangeConfig: Record<string, { duration: number; interval: number }> = {
    "5m": { duration: 5 * 60 * 1000, interval: 10 * 1000 },
    "1h": { duration: 60 * 60 * 1000, interval: 60 * 1000 },
    "6h": { duration: 6 * 60 * 60 * 1000, interval: 5 * 60 * 1000 },
    "24h": { duration: 24 * 60 * 60 * 1000, interval: 15 * 60 * 1000 },
    "7d": { duration: 7 * 24 * 60 * 60 * 1000, interval: 60 * 60 * 1000 },
  };
  
  const config = rangeConfig[timeRange] || rangeConfig["1h"];
  const numPoints = Math.floor(config.duration / config.interval);
  
  const getPriceAtTime = (timestamp: number): number => {
    const hoursAgo = (now - timestamp) / (60 * 60 * 1000);
    
    if (hoursAgo <= 0) return currentPrice;
    if (hoursAgo <= 1) {
      const t = hoursAgo / 1;
      return currentPrice + (price1hAgo - currentPrice) * t;
    }
    if (hoursAgo <= 6) {
      const t = (hoursAgo - 1) / 5;
      return price1hAgo + (price6hAgo - price1hAgo) * t;
    }
    if (hoursAgo <= 24) {
      const t = (hoursAgo - 6) / 18;
      return price6hAgo + (price24hAgo - price6hAgo) * t;
    }
    const daysBack = hoursAgo / 24;
    return price24hAgo * Math.pow(1 + priceChange24h / 100, -(daysBack - 1));
  };
  
  for (let i = 0; i < numPoints; i++) {
    const timestamp = now - config.duration + (i * config.interval);
    const basePrice = getPriceAtTime(timestamp);
    const variance = (Math.random() - 0.5) * basePrice * 0.02;
    
    points.push({
      timestamp,
      price: Math.max(0, basePrice + variance),
      volume: volume24h / (24 * 60 / (config.interval / 60000)),
    });
  }
  
  points.push({
    timestamp: now,
    price: currentPrice,
    volume: volume24h / 24,
  });
  
  console.log(`[DexScreener] Generated ${points.length} simulated price points for ${timeRange} (fallback)`);
  return points;
}

export async function fetchHistoricalPrices(timeRange: string = "1h"): Promise<PricePoint[]> {
  const now = Date.now();
  
  // Return cached data if available and recent (2 min cache)
  const cached = historicalPriceData.get(timeRange);
  if (cached && cached.length > 0 && now - lastHistoricalFetch < 120000) {
    return cached;
  }
  
  try {
    // Try Birdeye API first for real OHLCV data
    const birdeyeData = await fetchBirdeyeOHLCV(timeRange);
    
    if (birdeyeData && birdeyeData.length > 0) {
      historicalPriceData.set(timeRange, birdeyeData);
      lastHistoricalFetch = now;
      return birdeyeData;
    }
    
    // Fallback to DexScreener simulated data
    const dexScreenerData = await fetchDexScreenerSimulatedPrices(timeRange);
    historicalPriceData.set(timeRange, dexScreenerData);
    lastHistoricalFetch = now;
    return dexScreenerData;
  } catch (error) {
    console.error("[Historical] Error fetching prices:", error);
    return priceHistory;
  }
}

export async function initializePriceHistory(): Promise<void> {
  try {
    const metrics = await fetchTokenMetrics();
    if (metrics && metrics.price > 0) {
      addPricePoint(metrics);
      console.log("[Solana] Initialized with real price data");
    }
  } catch (error) {
    console.error("[Solana] Failed to initialize price history:", error);
  }
}

// Format token amount for display
function formatTokenAmount(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toFixed(0);
}

// Fetch recent token activity from blockchain
export async function fetchRecentTokenActivity(): Promise<ActivityItem[]> {
  const now = Date.now();
  
  // Return cached data if fresh (60s TTL)
  if (activityCache.length > 0 && now - lastActivityFetch < ACTIVITY_CACHE_TTL) {
    return activityCache;
  }
  
  try {
    const conn = getConnection();
    const tokenPubkey = new PublicKey(TOKEN_ADDRESS);
    
    // Fetch recent signatures for the token address
    const signatures = await conn.getSignaturesForAddress(tokenPubkey, { limit: 30 });
    
    if (signatures.length === 0) {
      console.log("[Activity] No recent signatures found for token");
      return activityCache;
    }
    
    console.log(`[Activity] Fetching ${signatures.length} recent token transactions`);
    
    const newActivity: ActivityItem[] = [];
    const existingIds = new Set(activityCache.map(a => a.id));
    
    // Process signatures in batches to avoid overwhelming RPC
    for (const sig of signatures.slice(0, 25)) {
      if (!sig.blockTime) continue;
      
      const activityId = `tx-${sig.signature.slice(0, 12)}`;
      
      // Skip if already in cache (deduplication)
      if (existingIds.has(activityId)) continue;
      
      try {
        const tx = await conn.getTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });
        
        if (!tx || !tx.meta || tx.meta.err) continue;
        
        const preBalances = tx.meta.preBalances || [];
        const postBalances = tx.meta.postBalances || [];
        const preTokenBalances = tx.meta.preTokenBalances || [];
        const postTokenBalances = tx.meta.postTokenBalances || [];
        
        // Check if this is a buy transaction (SOL decreased, tokens increased)
        // Look for token balance changes in the $NORMIE token
        let tokenReceived = 0;
        let solSpent = 0;
        
        // Calculate SOL spent (first account is typically the signer)
        if (postBalances[0] < preBalances[0]) {
          solSpent = (preBalances[0] - postBalances[0]) / 1e9;
        }
        
        // Look for token balance increases
        for (const postToken of postTokenBalances) {
          if (postToken.mint === TOKEN_ADDRESS) {
            const preToken = preTokenBalances.find(
              t => t.accountIndex === postToken.accountIndex && t.mint === TOKEN_ADDRESS
            );
            const preAmount = preToken?.uiTokenAmount?.uiAmount || 0;
            const postAmount = postToken.uiTokenAmount?.uiAmount || 0;
            
            if (postAmount > preAmount) {
              tokenReceived = postAmount - preAmount;
              break;
            }
          }
        }
        
        // Determine transaction type based on patterns
        if (tokenReceived > 0 && solSpent > 0.001) {
          // This is a buy - SOL spent and tokens received
          const isLargeBuy = tokenReceived >= 1000000; // 1M+ tokens
          const message = isLargeBuy 
            ? `Large buy: ${formatTokenAmount(tokenReceived)} $NORMIE`
            : `Buy: ${formatTokenAmount(tokenReceived)} $NORMIE`;
          
          newActivity.push({
            id: activityId,
            type: "trade",
            message,
            amount: tokenReceived,
            timestamp: new Date(sig.blockTime * 1000).toISOString(),
          });
        } else if (solSpent > 0.01) {
          // Generic trade activity
          const estimatedTokens = solSpent * (currentMetrics?.price ? 1 / currentMetrics.price : 1000000);
          const message = `Trade: ~${formatTokenAmount(estimatedTokens)} $NORMIE`;
          
          newActivity.push({
            id: activityId,
            type: "trade",
            message,
            amount: estimatedTokens,
            timestamp: new Date(sig.blockTime * 1000).toISOString(),
          });
        }
        
      } catch (txError) {
        // Silently continue on individual transaction errors
        continue;
      }
    }
    
    if (newActivity.length > 0) {
      // Merge new activity with cache, avoiding duplicates
      const mergedActivity = [...newActivity, ...activityCache];
      const uniqueActivity = mergedActivity.filter((item, index) => 
        mergedActivity.findIndex(a => a.id === item.id) === index
      );
      
      // Sort by timestamp descending and limit to 50 items
      activityCache = uniqueActivity
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 50);
      
      lastActivityFetch = now;
      lastRpcSuccess = now;
      
      console.log(`[Activity] Cached ${activityCache.length} activity items (${newActivity.length} new)`);
    } else {
      lastActivityFetch = now;
    }
    
    return activityCache;
    
  } catch (error) {
    console.error("[Activity] Error fetching token activity:", error);
    return activityCache;
  }
}

// Get cached activity items
export function getActivityCache(): ActivityItem[] {
  return activityCache;
}

initializePriceHistory();
