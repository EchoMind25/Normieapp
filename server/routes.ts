import type { Express } from "express";
import { createServer, type Server } from "http";
import { fetchTokenMetrics, getMetrics, getPriceHistory, addPricePoint } from "./solana";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  const updateMetrics = async () => {
    try {
      const metrics = await fetchTokenMetrics();
      addPricePoint(metrics);
    } catch (error) {
      console.error("[Metrics] Update error:", error);
    }
  };
  
  setInterval(updateMetrics, 5000);
  
  app.get("/api/metrics", async (_req, res) => {
    try {
      const metrics = await fetchTokenMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });
  
  app.get("/api/price-history", (_req, res) => {
    try {
      const history = getPriceHistory();
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch price history" });
    }
  });
  
  app.get("/api/token", (_req, res) => {
    res.json({
      address: "FrSFwE2BxWADEyUWFXDMAeomzuB4r83ZvzdG9sevpump",
      name: "NORMIE",
      symbol: "$NORMIE",
      decimals: 6,
      telegram: "@TheNormieNation",
      twitter: "@NormieCEO",
    });
  });

  return httpServer;
}
