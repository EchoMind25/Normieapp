import { Connection, PublicKey } from "@solana/web3.js";
import { NORMIE_TOKEN } from "@shared/schema";
import type { TokenMetrics, PricePoint, DevBuy, ActivityItem } from "@shared/schema";
import { fetchStreamflowLockedTokens, getLockedTokens } from "./streamflow";
import { sendWhaleAlertNotification, sendJeetAlarmNotification } from "./pushNotifications";
import { storage } from "./storage";

// Whale buy threshold: 2% of total supply (1 billion tokens)
const TOTAL_SUPPLY = 1_000_000_000;
const WHALE_BUY_PERCENT_THRESHOLD = 2; // 2% of supply = 20M tokens
const WHALE_BUY_THRESHOLD = TOTAL_SUPPLY * (WHALE_BUY_PERCENT_THRESHOLD / 100); // 20,000,000
const JEET_SELL_THRESHOLD = 5_000_000;
const notifiedTransactions = new Set<string>();

const RPC_ENDPOINT = "https://solana-rpc.publicnode.com";
const DEXSCREENER_API = "https://api.dexscreener.com/latest/dex/tokens";
const BIRDEYE_API = "https://public-api.birdeye.so";
const TOKEN_ADDRESS = NORMIE_TOKEN.address;
const DEV_WALLET = "8eQ8axmX7hwWdMxpq5KcqnTwMZyxjAzo7fc5sEdvj2EB";
const BURN_ADDRESS = "1nc1nerator11111111111111111111111111111111";
const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY || "";
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || "";
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

// Per dev (@NormieCEO) on X: OVER 527 million burned/locked total
// Burned + Locked combined = 527M+ (shown as "Supply Stranglehold")
const BURNED_TOKENS: number = 31200000;  // ~31.2M burned
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

// Holder count cache (Helius API)
let cachedHolderCount = 0;
let lastHolderFetch = 0;
const HOLDER_CACHE_TTL = 300000; // 5 minutes

function getConnection(): Connection {
  if (!connection) {
    // Prefer Helius RPC if available, otherwise use public endpoint
    const endpoint = HELIUS_API_KEY ? HELIUS_RPC_URL : RPC_ENDPOINT;
    connection = new Connection(endpoint, "confirmed");
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

// Fetch holder count from Helius API
async function fetchHolderCount(): Promise<number> {
  const now = Date.now();
  
  // Return cached value if fresh
  if (now - lastHolderFetch < HOLDER_CACHE_TTL) {
    return cachedHolderCount;
  }
  
  if (!HELIUS_API_KEY) {
    console.log("[Helius] No API key configured for holder count");
    return cachedHolderCount;
  }
  
  try {
    const uniqueOwners = new Set<string>();
    let cursor: string | undefined = undefined;
    let requestCount = 0;
    const maxRequests = 50; // Safety limit to prevent infinite loops
    
    do {
      const params: any = {
        limit: 1000,
        mint: TOKEN_ADDRESS,
      };
      
      if (cursor) {
        params.cursor = cursor;
      }
      
      const response = await fetch(HELIUS_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "getTokenAccounts",
          id: "helius-holders",
          params,
        }),
      });
      
      if (!response.ok) {
        console.error(`[Helius] API error: ${response.status}`);
        break;
      }
      
      const data = await response.json();
      
      if (!data.result || !data.result.token_accounts || data.result.token_accounts.length === 0) {
        break;
      }
      
      // Count unique owners with balance > 0
      for (const account of data.result.token_accounts) {
        if (account.amount > 0) {
          uniqueOwners.add(account.owner);
        }
      }
      
      // Get cursor for next page
      cursor = data.result.cursor;
      requestCount++;
      
    } while (cursor && requestCount < maxRequests);
    
    // Only update cache if we successfully fetched at least one page with data
    if (requestCount > 0 && uniqueOwners.size > 0) {
      cachedHolderCount = uniqueOwners.size;
      console.log(`[Helius] Fetched holder count: ${cachedHolderCount} unique holders (${requestCount} requests)`);
    } else if (requestCount > 0) {
      // API responded but no holders found - keep previous cache value
      console.log(`[Helius] No holders found in response, keeping cached value: ${cachedHolderCount}`);
    }
    
    // Always update lastHolderFetch to respect TTL and prevent rapid retries
    lastHolderFetch = now;
    
    return cachedHolderCount;
  } catch (error) {
    console.error("[Helius] Error fetching holder count:", error);
    // Update lastHolderFetch to prevent rapid retries on error, but keep cached value
    lastHolderFetch = now;
    return cachedHolderCount;
  }
}

// Dev wallet holdings cache
interface DevWalletHoldings {
  tokensHeld: number;
  usdValue: number;
  lastUpdated: string;
}

let cachedDevWalletHoldings: DevWalletHoldings | null = null;
let lastDevWalletFetch = 0;
const DEV_WALLET_CACHE_TTL = 120000; // 2 minutes

// Fetch dev/Normie wallet holdings
export async function fetchDevWalletHoldings(): Promise<DevWalletHoldings> {
  const now = Date.now();
  
  // Return cached value if fresh
  if (cachedDevWalletHoldings && now - lastDevWalletFetch < DEV_WALLET_CACHE_TTL) {
    return cachedDevWalletHoldings;
  }
  
  try {
    const conn = getConnection();
    const devPubkey = new PublicKey(DEV_WALLET);
    const tokenPubkey = new PublicKey(TOKEN_ADDRESS);
    
    // Get all token accounts for the dev wallet
    const tokenAccounts = await conn.getTokenAccountsByOwner(devPubkey, {
      mint: tokenPubkey,
    });
    
    let totalTokens = 0;
    
    for (const { account } of tokenAccounts.value) {
      // Parse token account data - amount is at offset 64, 8 bytes (u64)
      const data = account.data;
      if (data.length >= 72) {
        // Token amount is stored as u64 at offset 64
        const amount = Number(data.readBigUInt64LE(64));
        // Convert from raw amount (with 6 decimals for NORMIE)
        totalTokens += amount / 1_000_000;
      }
    }
    
    // Get current price for USD value - fetch if not available
    let currentPrice = currentMetrics?.price;
    if (!currentPrice) {
      // Fetch price directly from DexScreener if metrics not available
      try {
        const dexResponse = await fetch(`${DEXSCREENER_API}/${TOKEN_ADDRESS}`);
        if (dexResponse.ok) {
          const dexData = await dexResponse.json();
          if (dexData.pairs && dexData.pairs.length > 0) {
            currentPrice = parseFloat(dexData.pairs[0].priceUsd) || 0;
          }
        }
      } catch (e) {
        console.error("[DevWallet] Error fetching price:", e);
      }
    }
    const usdValue = totalTokens * (currentPrice || 0);
    
    cachedDevWalletHoldings = {
      tokensHeld: totalTokens,
      usdValue,
      lastUpdated: new Date().toISOString(),
    };
    
    lastDevWalletFetch = now;
    console.log(`[DevWallet] Holdings: ${(totalTokens / 1_000_000).toFixed(2)}M tokens ($${usdValue.toFixed(2)})`);
    
    return cachedDevWalletHoldings;
  } catch (error) {
    console.error("[DevWallet] Error fetching holdings:", error);
    
    // Return cached or empty value
    return cachedDevWalletHoldings || {
      tokensHeld: 0,
      usdValue: 0,
      lastUpdated: new Date().toISOString(),
    };
  }
}

export function getDevWalletAddress(): string {
  return DEV_WALLET;
}

export async function fetchTokenMetrics(): Promise<TokenMetrics> {
  const now = Date.now();
  
  if (currentMetrics && now - lastDexScreenerFetch < 5000) {
    return currentMetrics;
  }
  
  try {
    // Fetch DexScreener data, burned tokens, Streamflow locked tokens, and holder count in parallel
    const [response, burnedTokens, lockedTokens, holderCount] = await Promise.all([
      fetch(`${DEXSCREENER_API}/${TOKEN_ADDRESS}`),
      fetchBurnedTokens(),
      fetchStreamflowLockedTokens(),
      fetchHolderCount(),
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
      
      console.log(`[DexScreener] Fetched real data - Price: $${price.toFixed(8)}, MCap: $${marketCap}, Burned: ${formatBurnedTokens(burnedTokens)}, Locked: ${formatBurnedTokens(lockedTokens)}, Holders: ${holderCount}`);
      
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
        holders: holderCount,
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
      holders: cachedHolderCount,
      lastUpdated: new Date().toISOString(),
    };
  }
}

export async function fetchDevBuys(): Promise<DevBuy[]> {
  try {
    console.log("[DevBuys] Fetching dev wallet transactions...");
    const conn = getConnection();
    const devPubkey = new PublicKey(DEV_WALLET);
    
    // Fetch more signatures to capture historical buys
    const signatures = await conn.getSignaturesForAddress(devPubkey, { limit: 200 });
    
    if (signatures.length > 0) {
      console.log(`[Solana] Found ${signatures.length} dev wallet transactions`);
      
      const recentBuys: DevBuy[] = [];
      
      // Process more transactions to get better coverage
      for (const sig of signatures.slice(0, 50)) {
        if (!sig.blockTime) continue;
        
        try {
          const tx = await conn.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });
          
          if (tx && tx.meta && !tx.meta.err) {
            const preBalances = tx.meta.preBalances || [];
            const postBalances = tx.meta.postBalances || [];
            const preTokenBalances = tx.meta.preTokenBalances || [];
            const postTokenBalances = tx.meta.postTokenBalances || [];
            
            // Check for SOL spent
            const solSpent = (preBalances[0] - postBalances[0]) / 1e9;
            
            // Check for NORMIE token received
            let tokenReceived = 0;
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
            
            // A dev buy: SOL was spent AND tokens were received
            if (solSpent > 0.005 && tokenReceived > 0) {
              const devBuy: DevBuy = {
                signature: sig.signature,
                timestamp: sig.blockTime * 1000,
                amount: tokenReceived,
                price: currentMetrics?.price || 0,
              };
              recentBuys.push(devBuy);
              
              // Store to database if not already stored
              await storeDevBuyToDatabase(devBuy, solSpent);
            } else if (solSpent > 0.01 && tokenReceived === 0) {
              // Fallback: estimate tokens if we can detect it's a swap tx
              const estimatedTokens = solSpent * (currentMetrics?.price ? 1 / currentMetrics.price : 1000000);
              if (estimatedTokens > 10000) {
                const devBuy: DevBuy = {
                  signature: sig.signature,
                  timestamp: sig.blockTime * 1000,
                  amount: estimatedTokens,
                  price: currentMetrics?.price || 0,
                };
                recentBuys.push(devBuy);
                
                // Store to database if not already stored
                await storeDevBuyToDatabase(devBuy, solSpent);
              }
            }
          }
        } catch (txError) {
          // Silently continue on individual tx errors
          continue;
        }
      }
      
      if (recentBuys.length > 0) {
        // Sort by timestamp descending
        recentBuys.sort((a, b) => b.timestamp - a.timestamp);
        devBuys = recentBuys;
        console.log(`[Solana] Identified ${recentBuys.length} dev buys`);
      }
    }
  } catch (error: any) {
    console.error("[DevBuys] Error fetching from Solana RPC:", error?.message || error);
    console.log(`[DevBuys] Returning ${devBuys.length} cached dev buys`);
  }
  
  return devBuys;
}

// Store dev buy to database if not already stored
async function storeDevBuyToDatabase(devBuy: DevBuy, solSpent: number): Promise<void> {
  try {
    const existing = await storage.getStoredDevBuyBySignature(devBuy.signature);
    if (!existing) {
      await storage.createStoredDevBuy({
        signature: devBuy.signature,
        timestamp: new Date(devBuy.timestamp),
        amount: devBuy.amount.toString(),
        price: devBuy.price.toString(),
        solSpent: solSpent.toString(),
      });
      console.log(`[DevBuys] Stored new dev buy: ${devBuy.signature.slice(0, 8)}...`);
    }
  } catch (error: any) {
    // Ignore duplicate key errors (already stored)
    if (!error?.message?.includes("duplicate key")) {
      console.error("[DevBuys] Error storing to database:", error?.message || error);
    }
  }
}

// Store whale buy to database
async function storeWhaleBuyToDatabase(
  signature: string,
  walletAddress: string,
  timestamp: number,
  amount: number,
  price: number,
  solSpent: number
): Promise<void> {
  try {
    const existing = await storage.getWhaleBuyBySignature(signature);
    if (!existing) {
      const percentOfSupply = (amount / TOTAL_SUPPLY) * 100;
      await storage.createWhaleBuy({
        signature,
        walletAddress,
        timestamp: new Date(timestamp),
        amount: amount.toString(),
        price: price.toString(),
        solSpent: solSpent.toString(),
        percentOfSupply: percentOfSupply.toFixed(2),
      });
      console.log(`[WhaleBuy] Stored new whale buy: ${signature.slice(0, 8)}... (${percentOfSupply.toFixed(2)}% of supply)`);
    }
  } catch (error: any) {
    // Ignore duplicate key errors
    if (!error?.message?.includes("duplicate key")) {
      console.error("[WhaleBuy] Error storing to database:", error?.message || error);
    }
  }
}

// Check if a transaction is a whale buy (>2% of supply) and store it
export async function checkAndStoreWhaleBuy(
  signature: string,
  walletAddress: string,
  amount: number,
  timestamp: number,
  solSpent: number
): Promise<boolean> {
  if (amount >= WHALE_BUY_THRESHOLD) {
    const price = currentMetrics?.price || 0;
    await storeWhaleBuyToDatabase(signature, walletAddress, timestamp, amount, price, solSpent);
    return true;
  }
  return false;
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
  // Return sorted (oldest first) to ensure correct chart display
  return [...priceHistory].sort((a, b) => a.timestamp - b.timestamp);
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
    "all": { type: "1D", duration: 365 * 24 * 60 * 60 }, // All time - daily intervals for up to 1 year
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
    
    // Sort chronologically (oldest first) to ensure correct chart display
    points.sort((a, b) => a.timestamp - b.timestamp);
    
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
    "all": { duration: 90 * 24 * 60 * 60 * 1000, interval: 24 * 60 * 60 * 1000 }, // ~90 days with daily intervals
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
    // Return sorted fallback data
    return [...priceHistory].sort((a, b) => a.timestamp - b.timestamp);
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
        
        // Look for token balance changes (both increases AND decreases)
        let tokenSold = 0;
        let solReceived = 0;
        
        // Calculate SOL received (first account is typically the signer)
        if (postBalances[0] > preBalances[0]) {
          solReceived = (postBalances[0] - preBalances[0]) / 1e9;
        }
        
        for (const postToken of postTokenBalances) {
          if (postToken.mint === TOKEN_ADDRESS) {
            const preToken = preTokenBalances.find(
              t => t.accountIndex === postToken.accountIndex && t.mint === TOKEN_ADDRESS
            );
            const preAmount = preToken?.uiTokenAmount?.uiAmount || 0;
            const postAmount = postToken.uiTokenAmount?.uiAmount || 0;
            
            if (postAmount > preAmount) {
              tokenReceived = postAmount - preAmount;
            } else if (preAmount > postAmount) {
              tokenSold = preAmount - postAmount;
            }
            break;
          }
        }
        
        // Also check preTokenBalances for sells (token account may be closed)
        if (tokenSold === 0 && tokenReceived === 0) {
          for (const preToken of preTokenBalances) {
            if (preToken.mint === TOKEN_ADDRESS) {
              const postToken = postTokenBalances.find(
                t => t.accountIndex === preToken.accountIndex && t.mint === TOKEN_ADDRESS
              );
              const preAmount = preToken?.uiTokenAmount?.uiAmount || 0;
              const postAmount = postToken?.uiTokenAmount?.uiAmount || 0;
              
              if (preAmount > postAmount) {
                tokenSold = preAmount - postAmount;
                break;
              }
            }
          }
        }
        
        // Determine transaction type based on patterns
        if (tokenReceived > 0 && solSpent > 0.001) {
          // This is a buy - SOL spent and tokens received
          const isWhaleBuy = tokenReceived >= WHALE_BUY_THRESHOLD;
          const isLargeBuy = tokenReceived >= 1000000; // 1M+ tokens
          const message = isWhaleBuy
            ? `WHALE BUY: ${formatTokenAmount(tokenReceived)} $NORMIE`
            : isLargeBuy 
            ? `Large buy: ${formatTokenAmount(tokenReceived)} $NORMIE`
            : `Buy: ${formatTokenAmount(tokenReceived)} $NORMIE`;
          
          newActivity.push({
            id: activityId,
            type: "trade",
            message,
            amount: tokenReceived,
            timestamp: new Date(sig.blockTime * 1000).toISOString(),
          });
          
          // Send push notification for whale buys (only once per transaction)
          if (isWhaleBuy && !notifiedTransactions.has(sig.signature)) {
            notifiedTransactions.add(sig.signature);
            sendWhaleAlertNotification(tokenReceived, sig.signature).catch(err => {
              console.error("[Push] Error sending whale alert:", err);
            });
          }
        } else if (tokenSold > 0 && solReceived > 0.001) {
          // This is a sell - tokens sold and SOL received
          const isJeetSell = tokenSold >= JEET_SELL_THRESHOLD;
          const isLargeSell = tokenSold >= 1000000; // 1M+ tokens
          const message = isJeetSell
            ? `JEET SELL: ${formatTokenAmount(tokenSold)} $NORMIE`
            : isLargeSell
            ? `Large sell: ${formatTokenAmount(tokenSold)} $NORMIE`
            : `Sell: ${formatTokenAmount(tokenSold)} $NORMIE`;
          
          newActivity.push({
            id: activityId,
            type: "trade",
            message,
            amount: -tokenSold, // Negative to indicate sell
            timestamp: new Date(sig.blockTime * 1000).toISOString(),
          });
          
          // Persist ALL sells to database for leaderboard tracking
          try {
            // Get wallet address from transaction accounts (first signer)
            const message = tx.transaction.message;
            const accountKeys = message.getAccountKeys?.();
            const firstKey = accountKeys?.get?.(0) || (message as any).accountKeys?.[0];
            const walletAddress = firstKey?.toBase58?.() || firstKey?.toString() || "";
            
            if (walletAddress) {
              // Check if already stored
              const existing = await storage.getJeetSellBySignature(sig.signature);
              if (!existing) {
                const sellTime = new Date(sig.blockTime * 1000);
                
                // Store individual transaction
                await storage.createJeetSell({
                  signature: sig.signature,
                  walletAddress,
                  soldAmount: tokenSold.toFixed(6),
                  soldValueSol: solReceived.toFixed(9),
                  slot: tx.slot,
                  blockTime: sellTime,
                });
                
                // Update wallet totals (UPSERT)
                await storage.upsertJeetWalletTotal(
                  walletAddress,
                  tokenSold,
                  solReceived,
                  sellTime
                );
                
                console.log(`[Jeet] Tracked sell: ${formatTokenAmount(tokenSold)} $NORMIE by ${walletAddress.slice(0,8)}...`);
              }
            }
          } catch (storeErr) {
            console.error("[Jeet] Error storing sell:", storeErr);
          }
          
          // Send push notification for jeet sells (only once per transaction)
          if (isJeetSell && !notifiedTransactions.has(sig.signature)) {
            notifiedTransactions.add(sig.signature);
            sendJeetAlarmNotification(tokenSold, sig.signature).catch(err => {
              console.error("[Push] Error sending jeet alarm:", err);
            });
          }
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

// =====================================================
// Historical Jeet Backfill - Fetch historical sells from Birdeye
// =====================================================

interface BirdeyeTrade {
  txHash: string;
  blockUnixTime: number;
  owner: string;
  side: "buy" | "sell";
  tokenAmount: number;
  solAmount: number;
  priceUsd: number;
}

let backfillInProgress = false;

export async function backfillHistoricalJeets(limit: number = 500): Promise<{
  success: boolean;
  processed: number;
  newSells: number;
  error?: string;
}> {
  if (!BIRDEYE_API_KEY) {
    return { success: false, processed: 0, newSells: 0, error: "BIRDEYE_API_KEY not configured" };
  }
  
  if (backfillInProgress) {
    return { success: false, processed: 0, newSells: 0, error: "Backfill already in progress" };
  }
  
  backfillInProgress = true;
  let processed = 0;
  let newSells = 0;
  const pageSize = 50; // Birdeye page size
  let offset = 0;
  let hasMore = true;
  
  try {
    console.log(`[Jeet Backfill] Starting historical backfill (limit: ${limit})...`);
    
    // Paginate through Birdeye API
    while (hasMore && processed < limit) {
      const url = `${BIRDEYE_API}/defi/txs/token?address=${TOKEN_ADDRESS}&offset=${offset}&limit=${pageSize}&tx_type=swap`;
      
      const response = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "X-API-KEY": BIRDEYE_API_KEY,
          "x-chain": "solana",
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Jeet Backfill] Birdeye API error ${response.status}: ${errorText}`);
        // If rate limited, stop but don't fail - we got some data
        if (response.status === 429) {
          console.log(`[Jeet Backfill] Rate limited after ${processed} trades, stopping pagination`);
          break;
        }
        backfillInProgress = false;
        return { success: false, processed, newSells, error: `Birdeye API error: ${response.status}` };
      }
      
      const data = await response.json();
      
      if (!data.success || !data.data?.items || data.data.items.length === 0) {
        console.log(`[Jeet Backfill] No more trades at offset ${offset}`);
        hasMore = false;
        break;
      }
      
      const trades: BirdeyeTrade[] = data.data.items;
      console.log(`[Jeet Backfill] Page offset=${offset}: ${trades.length} trades`);
      
      // Process each sell trade
      for (const trade of trades) {
        if (processed >= limit) break;
        processed++;
        
        // Only process sell transactions
        if (trade.side !== "sell") continue;
        
        const tokenAmount = trade.tokenAmount || 0;
        const solAmount = trade.solAmount || 0;
        const walletAddress = trade.owner || "";
        const signature = trade.txHash || "";
        
        if (!walletAddress || !signature || tokenAmount <= 0) continue;
        
        try {
          // Check if already stored
          const existing = await storage.getJeetSellBySignature(signature);
          if (existing) continue;
          
          const sellTime = new Date(trade.blockUnixTime * 1000);
          
          // Store individual transaction
          await storage.createJeetSell({
            signature,
            walletAddress,
            soldAmount: tokenAmount.toFixed(6),
            soldValueSol: solAmount.toFixed(9),
            slot: null,
            blockTime: sellTime,
          });
          
          // Update wallet totals
          await storage.upsertJeetWalletTotal(
            walletAddress,
            tokenAmount,
            solAmount,
            sellTime
          );
          
          newSells++;
          
          if (newSells % 25 === 0) {
            console.log(`[Jeet Backfill] Processed ${newSells} new sells...`);
          }
        } catch (err) {
          console.error(`[Jeet Backfill] Error storing trade ${signature}:`, err);
        }
      }
      
      // Move to next page
      offset += trades.length;
      
      // If we got fewer than pageSize, we've reached the end
      if (trades.length < pageSize) {
        hasMore = false;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`[Jeet Backfill] Complete! Processed ${processed} trades, ${newSells} new sells stored`);
    backfillInProgress = false;
    
    return { success: true, processed, newSells };
  } catch (error) {
    console.error("[Jeet Backfill] Error:", error);
    backfillInProgress = false;
    return { success: false, processed, newSells, error: String(error) };
  }
}

export function isBackfillInProgress(): boolean {
  return backfillInProgress;
}

initializePriceHistory();
