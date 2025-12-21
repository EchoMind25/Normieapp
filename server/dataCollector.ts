import { smartDataFetcher } from "./smartDataFetcher";
import { NORMIE_TOKEN } from "@shared/schema";

class DataCollector {
  private isRunning: boolean = false;
  private collectionInterval: ReturnType<typeof setInterval> | null = null;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private consecutiveErrors: number = 0;
  private maxConsecutiveErrors: number = 5;
  private baseInterval: number = 60000;
  private currentInterval: number = 60000;
  private pendingIntervalChange: number | null = null;

  async collectTokenData(): Promise<void> {
    try {
      const result = await smartDataFetcher.fetchTokenMetrics();
      
      if (result.changed) {
        console.log(`[DataCollector] Token metrics updated (from cache: ${result.fromCache})`);
      }
      
      this.consecutiveErrors = 0;
      
      const newInterval = await smartDataFetcher.determinePollInterval(NORMIE_TOKEN.address);
      if (newInterval !== this.currentInterval) {
        this.pendingIntervalChange = newInterval;
      }
    } catch (error) {
      this.consecutiveErrors++;
      console.error(`[DataCollector] Error collecting data (${this.consecutiveErrors}/${this.maxConsecutiveErrors}):`, error);
      
      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        this.pendingIntervalChange = Math.min(this.currentInterval * 2, 300000);
        console.warn(`[DataCollector] Too many errors, will back off to ${this.pendingIntervalChange}ms interval`);
      }
    }
    
    if (this.pendingIntervalChange !== null) {
      this.currentInterval = this.pendingIntervalChange;
      this.pendingIntervalChange = null;
      this.restartCollection();
    }
  }

  private restartCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    
    this.collectionInterval = setInterval(
      () => this.collectTokenData(),
      this.currentInterval
    );
    
    console.log(`[DataCollector] Collection interval set to ${this.currentInterval}ms`);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("[DataCollector] Already running");
      return;
    }

    this.isRunning = true;
    console.log("[DataCollector] Starting background data collection...");
    
    await this.collectTokenData();
    
    this.collectionInterval = setInterval(
      () => this.collectTokenData(),
      this.currentInterval
    );
    
    this.cleanupInterval = setInterval(
      async () => {
        try {
          await smartDataFetcher.cleanupOldData(30);
          console.log("[DataCollector] Old data cleaned up");
        } catch (error) {
          console.error("[DataCollector] Cleanup error:", error);
        }
      },
      24 * 60 * 60 * 1000
    );

    console.log("[DataCollector] Background collection started");
  }

  stop(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.isRunning = false;
    console.log("[DataCollector] Stopped");
  }

  getStatus(): { isRunning: boolean; interval: number; errors: number } {
    return {
      isRunning: this.isRunning,
      interval: this.currentInterval,
      errors: this.consecutiveErrors,
    };
  }
}

export const dataCollector = new DataCollector();
