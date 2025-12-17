import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { fetchTokenMetrics, getMetrics, getPriceHistory, addPricePoint, fetchDevBuys, getDevBuys, getConnectionStatus, fetchHistoricalPrices } from "./solana";
import authRoutes from "./authRoutes";
import { db } from "./db";
import { manualDevBuys, users, sessions } from "@shared/schema";
import { eq, desc, and, gt } from "drizzle-orm";
import { verifyJWT } from "./auth";
import { z } from "zod";
import { storage } from "./storage";

const manualDevBuyInputSchema = z.object({
  timestamp: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date format"),
  amount: z.number().positive("Amount must be positive"),
  price: z.number().positive("Price must be positive"),
  label: z.string().max(100).optional(),
});

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") 
      ? authHeader.substring(7) 
      : req.cookies?.token;
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const decoded = verifyJWT(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }
    
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())));
    
    if (!session) {
      return res.status(401).json({ error: "Session expired or invalid" });
    }
    
    const [user] = await db.select().from(users).where(eq(users.id, decoded.userId));
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    (req as any).userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests, try again later" },
  validate: { xForwardedForHeader: false },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many authentication attempts, try again later" },
  validate: { xForwardedForHeader: false },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.use(cookieParser());
  
  app.use("/api/auth", authLimiter, authRoutes);
  
  app.use("/api", apiLimiter);
  
  const updateMetrics = async () => {
    try {
      const metrics = await fetchTokenMetrics();
      addPricePoint(metrics);
    } catch (error) {
      console.error("[Metrics] Update error:", error);
    }
  };
  
  const updateDevBuys = async () => {
    try {
      await fetchDevBuys();
    } catch (error) {
      console.error("[DevBuys] Update error:", error);
    }
  };
  
  setInterval(updateMetrics, 5000);
  setInterval(updateDevBuys, 60000);
  updateDevBuys();
  
  app.get("/api/metrics", async (_req, res) => {
    try {
      res.set("Cache-Control", "no-store, no-cache, must-revalidate");
      res.set("Pragma", "no-cache");
      const metrics = await fetchTokenMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });
  
  app.get("/api/price-history", async (req, res) => {
    try {
      res.set("Cache-Control", "no-store, no-cache, must-revalidate");
      res.set("Pragma", "no-cache");
      const timeRange = (req.query.range as string) || "live";
      
      if (timeRange === "live") {
        const history = getPriceHistory();
        res.json(history);
      } else {
        const history = await fetchHistoricalPrices(timeRange);
        res.json(history);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch price history" });
    }
  });
  
  app.get("/api/dev-buys", async (_req, res) => {
    try {
      res.set("Cache-Control", "no-store, no-cache, must-revalidate");
      res.set("Pragma", "no-cache");
      
      const apiDevBuys = getDevBuys();
      
      const manualBuys = await db.select().from(manualDevBuys);
      const manualDevBuysFormatted = manualBuys
        .filter(b => b.amount && b.price && b.timestamp)
        .map(b => {
          const amount = parseFloat(b.amount);
          const price = parseFloat(b.price);
          if (isNaN(amount) || isNaN(price)) return null;
          return {
            signature: `manual-${b.id}`,
            timestamp: new Date(b.timestamp).getTime(),
            amount,
            price,
            label: b.label,
            isManual: true,
          };
        })
        .filter((b): b is NonNullable<typeof b> => b !== null);
      
      const allBuys = [...apiDevBuys, ...manualDevBuysFormatted].sort((a, b) => b.timestamp - a.timestamp);
      res.json(allBuys);
    } catch (error) {
      console.error("[DevBuys] Error:", error);
      res.status(500).json({ error: "Failed to fetch dev buys" });
    }
  });
  
  app.get("/api/status", (_req, res) => {
    try {
      const status = getConnectionStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to get status" });
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

  app.get("/api/admin/dev-buys", requireAdmin, async (_req, res) => {
    try {
      const buys = await db.select().from(manualDevBuys).orderBy(desc(manualDevBuys.timestamp));
      res.json(buys);
    } catch (error) {
      console.error("[Admin] Error fetching manual dev buys:", error);
      res.status(500).json({ error: "Failed to fetch manual dev buys" });
    }
  });

  app.post("/api/admin/dev-buys", requireAdmin, async (req, res) => {
    try {
      const validationResult = manualDevBuyInputSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: validationResult.error.flatten() 
        });
      }
      
      const { timestamp, amount, price, label } = validationResult.data;
      
      const [newBuy] = await db.insert(manualDevBuys).values({
        timestamp: new Date(timestamp),
        amount: amount.toString(),
        price: price.toString(),
        label: label || null,
        addedBy: (req as any).userId,
      }).returning();
      
      res.json(newBuy);
    } catch (error) {
      console.error("[Admin] Error adding manual dev buy:", error);
      res.status(500).json({ error: "Failed to add manual dev buy" });
    }
  });

  app.delete("/api/admin/dev-buys/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(manualDevBuys).where(eq(manualDevBuys.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("[Admin] Error deleting manual dev buy:", error);
      res.status(500).json({ error: "Failed to delete manual dev buy" });
    }
  });

  // =====================================================
  // Community Polls Routes
  // =====================================================
  
  app.get("/api/polls", async (_req, res) => {
    try {
      const activePolls = await storage.getActivePolls();
      const pollsFormatted = activePolls.map(poll => ({
        id: poll.id,
        question: poll.question,
        options: poll.options.map(opt => ({
          id: opt.id,
          text: opt.text,
          votes: opt.votes || 0,
        })),
        totalVotes: poll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0),
        isActive: poll.isActive,
        endsAt: poll.endsAt?.toISOString(),
      }));
      res.json(pollsFormatted);
    } catch (error) {
      console.error("[Polls] Error fetching polls:", error);
      res.status(500).json({ error: "Failed to fetch polls" });
    }
  });

  app.post("/api/polls/:pollId/vote", async (req, res) => {
    try {
      const { pollId } = req.params;
      const { optionId, visitorId } = req.body;
      
      if (!optionId || !visitorId) {
        return res.status(400).json({ error: "Option ID and visitor ID are required" });
      }
      
      const hasVoted = await storage.hasVoted(pollId, visitorId);
      if (hasVoted) {
        return res.status(400).json({ error: "You have already voted on this poll" });
      }
      
      await storage.vote(pollId, optionId, visitorId);
      
      const updatedPoll = await storage.getPoll(pollId);
      if (!updatedPoll) {
        return res.status(404).json({ error: "Poll not found" });
      }
      
      res.json({
        id: updatedPoll.id,
        question: updatedPoll.question,
        options: updatedPoll.options.map(opt => ({
          id: opt.id,
          text: opt.text,
          votes: opt.votes || 0,
        })),
        totalVotes: updatedPoll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0),
        isActive: updatedPoll.isActive,
      });
    } catch (error) {
      console.error("[Polls] Error voting:", error);
      res.status(500).json({ error: "Failed to vote" });
    }
  });

  app.get("/api/polls/:pollId/voted", async (req, res) => {
    try {
      const { pollId } = req.params;
      const visitorId = req.query.visitorId as string;
      
      if (!visitorId) {
        return res.status(400).json({ error: "Visitor ID is required" });
      }
      
      const hasVoted = await storage.hasVoted(pollId, visitorId);
      res.json({ hasVoted });
    } catch (error) {
      console.error("[Polls] Error checking vote status:", error);
      res.status(500).json({ error: "Failed to check vote status" });
    }
  });

  // Admin: Create poll
  app.post("/api/admin/polls", requireAdmin, async (req, res) => {
    try {
      const { question, options } = req.body;
      
      if (!question || !options || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ error: "Question and at least 2 options are required" });
      }
      
      const poll = await storage.createPoll(
        { question, isActive: true, createdBy: (req as any).userId },
        options
      );
      
      res.json(poll);
    } catch (error) {
      console.error("[Admin] Error creating poll:", error);
      res.status(500).json({ error: "Failed to create poll" });
    }
  });

  // =====================================================
  // Activity Feed Routes
  // =====================================================
  
  app.get("/api/activity", async (_req, res) => {
    try {
      const dbActivity = await storage.getRecentActivity(20);
      
      const devBuys = getDevBuys().slice(0, 5);
      const devBuyActivity = devBuys.map((buy, index) => ({
        id: `devbuy-${buy.signature.slice(0, 8)}`,
        type: "trade" as const,
        message: `Dev buy: ${(buy.amount / 1000000).toFixed(2)}M $NORMIE`,
        amount: buy.amount,
        timestamp: new Date(buy.timestamp).toISOString(),
      }));
      
      const formattedDbActivity = dbActivity.map(item => ({
        id: item.id,
        type: item.type as "burn" | "lock" | "trade" | "milestone",
        message: item.message,
        amount: item.amount ? parseFloat(item.amount) : undefined,
        timestamp: item.createdAt?.toISOString() || new Date().toISOString(),
      }));
      
      const allActivity = [...formattedDbActivity, ...devBuyActivity]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 20);
      
      res.json(allActivity);
    } catch (error) {
      console.error("[Activity] Error fetching activity:", error);
      res.status(500).json({ error: "Failed to fetch activity" });
    }
  });

  // Admin: Add activity item
  app.post("/api/admin/activity", requireAdmin, async (req, res) => {
    try {
      const { type, message, amount, txSignature } = req.body;
      
      if (!type || !message) {
        return res.status(400).json({ error: "Type and message are required" });
      }
      
      const activity = await storage.createActivityItem({
        type,
        message,
        amount: amount?.toString(),
        txSignature,
      });
      
      res.json(activity);
    } catch (error) {
      console.error("[Admin] Error adding activity:", error);
      res.status(500).json({ error: "Failed to add activity" });
    }
  });

  return httpServer;
}
