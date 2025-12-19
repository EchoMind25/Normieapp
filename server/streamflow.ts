import { SolanaStreamClient, getNumberFromBN, ICluster } from "@streamflow/stream";
import { NORMIE_TOKEN } from "@shared/schema";

const RPC_ENDPOINT = "https://solana-rpc.publicnode.com";
const NORMIE_MINT = NORMIE_TOKEN.address;

// Cache for locked tokens data
let cachedLockedTokens: number = 230000000; // Fallback value (230M)
let lastStreamflowFetch = 0;
const STREAMFLOW_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

let streamflowClient: SolanaStreamClient | null = null;

function getStreamflowClient(): SolanaStreamClient {
  if (!streamflowClient) {
    streamflowClient = new SolanaStreamClient({
      clusterUrl: RPC_ENDPOINT,
      cluster: ICluster.Mainnet
    });
  }
  return streamflowClient;
}

interface StreamflowLockInfo {
  totalLocked: number;
  lockCount: number;
  locks: Array<{
    id: string;
    amount: number;
    unlockDate: number;
    recipient: string;
  }>;
}

export async function fetchStreamflowLockedTokens(): Promise<number> {
  const now = Date.now();
  
  // Return cached value if still fresh
  if (now - lastStreamflowFetch < STREAMFLOW_CACHE_TTL) {
    console.log(`[Streamflow] Using cached locked tokens: ${(cachedLockedTokens / 1000000).toFixed(2)}M`);
    return cachedLockedTokens;
  }
  
  try {
    const client = getStreamflowClient();
    
    // Search for all streams/locks using the Normie token mint
    console.log(`[Streamflow] Searching for locks with mint: ${NORMIE_MINT.slice(0, 12)}...`);
    
    const streams = await client.searchStreams({
      mint: NORMIE_MINT,
    });
    
    if (!streams || streams.length === 0) {
      console.log("[Streamflow] No locks found for Normie token");
      lastStreamflowFetch = now;
      return cachedLockedTokens;
    }
    
    let totalLocked = 0;
    const currentTime = Math.floor(now / 1000);
    
    for (const streamData of streams) {
      const stream = streamData.account as any;
      if (!stream) continue;
      
      // Get deposited and withdrawn amounts
      // Token decimals for Normie is 6
      const depositedAmount = stream.depositedAmount 
        ? getNumberFromBN(stream.depositedAmount, 6) 
        : 0;
      const withdrawnAmount = stream.withdrawnAmount 
        ? getNumberFromBN(stream.withdrawnAmount, 6) 
        : 0;
      
      const remainingAmount = depositedAmount - withdrawnAmount;
      
      // Check if the stream is still locked (cliff not passed or tokens remaining)
      const cliffTime = stream.cliff || 0;
      const isStillLocked = cliffTime > currentTime && remainingAmount > 0;
      
      if (remainingAmount > 0 && isStillLocked) {
        totalLocked += remainingAmount;
      }
    }
    
    if (totalLocked > 0) {
      cachedLockedTokens = totalLocked;
      console.log(`[Streamflow] Found ${streams.length} streams, total locked: ${(totalLocked / 1000000).toFixed(2)}M NORMIE`);
    } else {
      console.log(`[Streamflow] Found ${streams.length} streams but none currently locked`);
    }
    
    lastStreamflowFetch = now;
    return cachedLockedTokens;
    
  } catch (error: any) {
    console.error("[Streamflow] Error fetching locked tokens:", error.message);
    lastStreamflowFetch = now; // Avoid hammering on errors
    return cachedLockedTokens;
  }
}

export async function getStreamflowLockDetails(): Promise<StreamflowLockInfo> {
  const client = getStreamflowClient();
  const lockInfo: StreamflowLockInfo = {
    totalLocked: 0,
    lockCount: 0,
    locks: []
  };
  
  try {
    const streams = await client.searchStreams({
      mint: NORMIE_MINT,
    });
    
    if (!streams || streams.length === 0) {
      return lockInfo;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    
    for (const streamData of streams) {
      const stream = streamData.account as any;
      if (!stream) continue;
      
      const depositedAmount = stream.depositedAmount 
        ? getNumberFromBN(stream.depositedAmount, 6) 
        : 0;
      const withdrawnAmount = stream.withdrawnAmount 
        ? getNumberFromBN(stream.withdrawnAmount, 6) 
        : 0;
      
      const remainingAmount = depositedAmount - withdrawnAmount;
      const cliffTime = stream.cliff || 0;
      const isStillLocked = cliffTime > currentTime && remainingAmount > 0;
      
      if (remainingAmount > 0 && isStillLocked) {
        lockInfo.totalLocked += remainingAmount;
        lockInfo.lockCount++;
        lockInfo.locks.push({
          id: streamData.publicKey?.toString() || 'unknown',
          amount: remainingAmount,
          unlockDate: cliffTime * 1000,
          recipient: stream.recipient?.toString() || 'unknown'
        });
      }
    }
    
    console.log(`[Streamflow] Lock details: ${lockInfo.lockCount} active locks, ${(lockInfo.totalLocked / 1000000).toFixed(2)}M total`);
    return lockInfo;
    
  } catch (error: any) {
    console.error("[Streamflow] Error getting lock details:", error.message);
    return lockInfo;
  }
}

export function getLockedTokens(): number {
  return cachedLockedTokens;
}

// Force refresh of cached data
export function invalidateLockCache(): void {
  lastStreamflowFetch = 0;
  console.log("[Streamflow] Lock cache invalidated");
}
