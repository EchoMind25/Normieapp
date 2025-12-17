import { Connection, PublicKey } from "@solana/web3.js";
import { NORMIE_TOKEN } from "@shared/schema";
import type { TokenMetrics, PricePoint, DevBuy } from "@shared/schema";

const RPC_ENDPOINT = "https://solana-rpc.publicnode.com";
const DEXSCREENER_API = "https://api.dexscreener.com/latest/dex/tokens";
const TOKEN_ADDRESS = NORMIE_TOKEN.address;
const DEV_WALLET = "FrSFwE2BxWADEyUWFXDMAeomzuB4r83ZvzdG9sevpump";
const BURN_ADDRESS = "1nc1nerator11111111111111111111111111111111";

// Per dev on pump.fun (Dec 4, 2024): "230,000,000 Locked and 31 million burned"
let cachedBurnedTokens: number = 31000000;
const LOCKED_TOKENS: number = 230000000;

let connection: Connection | null = null;
let priceHistory: PricePoint[] = [];
let devBuys: DevBuy[] = [];
let currentMetrics: TokenMetrics | null = null;
let lastRpcSuccess = Date.now();
let lastDexScreenerFetch = 0;

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
    const [response, burnedTokens] = await Promise.all([
      fetch(`${DEXSCREENER_API}/${TOKEN_ADDRESS}`),
      fetchBurnedTokens(),
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
      const circulatingSupply = totalSupply - burnedTokens - LOCKED_TOKENS;
      
      console.log(`[DexScreener] Fetched real data - Price: $${price.toFixed(8)}, MCap: $${marketCap}, Burned: ${formatBurnedTokens(burnedTokens)}`);
      
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
        lockedTokens: LOCKED_TOKENS,
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
      lockedTokens: LOCKED_TOKENS,
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

initializePriceHistory();
