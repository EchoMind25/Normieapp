import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fetchTokenMetrics, getMetrics, getPriceHistory, addPricePoint, fetchDevBuys, getDevBuys, getConnectionStatus, fetchHistoricalPrices, fetchRecentTokenActivity, getActivityCache, fetchDevWalletHoldings, getDevWalletAddress } from "./solana";
import authRoutes from "./authRoutes";
import { db, verifyDatabaseConnection, checkTablesExist, getEnvironmentName } from "./db";
import { manualDevBuys, users, sessions, userFeedback, insertUserFeedbackSchema, walletHoldings } from "@shared/schema";
import { eq, desc, and, gt, sql } from "drizzle-orm";
import { verifyJWT, isReservedUsername, authMiddleware, AuthRequest } from "./auth";
import { z } from "zod";
import { storage } from "./storage";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { initializePushNotifications, getVapidPublicKey, isPushEnabled, sendPushNotificationForNewPoll, sendStreamNotification } from "./pushNotifications";
import { smartDataFetcher } from "./smartDataFetcher";
import { bugReports, insertBugReportSchema, NORMIE_TOKEN } from "@shared/schema";
import sgMail from "@sendgrid/mail";
import { handleConditionalGet } from "./etag";

const SUPPORT_EMAIL = "support@tryechomind.net";
const BUG_REPORT_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@normie.observer";

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const galleryStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `gallery-${uniqueSuffix}${ext}`);
  },
});

const galleryUpload = multer({
  storage: galleryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG and PNG images are allowed"));
    }
  },
});

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
      : req.cookies?.authToken;
    
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
    if (!user || (user.role !== "admin" && user.role !== "founder")) {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    (req as any).userId = decoded.userId;
    (req as any).user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

async function requireFounder(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") 
      ? authHeader.substring(7) 
      : req.cookies?.authToken;
    
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
    if (!user || user.role !== "founder") {
      return res.status(403).json({ error: "Founder access required" });
    }
    
    (req as any).userId = decoded.userId;
    (req as any).user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

import { apiLimiter, embedLimiter } from "./rateLimiters";

// Allowed origins for embed CORS - exact match only
const EMBED_ALLOWED_ORIGINS = new Set([
  "https://normienation.com",
  "https://www.normienation.com",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5000",
]);

// CORS middleware for embed endpoints - strict origin validation
function embedCors(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  
  // In development, allow any origin; in production, strict whitelist
  const isDev = process.env.NODE_ENV !== "production";
  const isAllowed = isDev || (origin && EMBED_ALLOWED_ORIGINS.has(origin));
  
  if (isAllowed && origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Embed-Token");
    res.setHeader("Access-Control-Max-Age", "86400");
    res.setHeader("Vary", "Origin");
  } else if (!origin) {
    // No origin header (same-origin request or non-browser client)
    // Allow but don't set CORS headers
  } else {
    // Origin not in whitelist - reject CORS
    if (req.method === "OPTIONS") {
      return res.sendStatus(403);
    }
    // For actual requests, still process but without CORS headers
    // Browser will block cross-origin response
  }
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(isAllowed ? 204 : 403);
  }
  
  next();
}

// Optional embed token validation middleware - header only for security
function validateEmbedToken(req: Request, res: Response, next: NextFunction) {
  const embedToken = req.headers["x-embed-token"] as string | undefined;
  
  // If EMBED_SECRET is set, require token validation via header only
  const embedSecret = process.env.EMBED_SECRET;
  if (embedSecret && embedSecret.length > 0) {
    if (!embedToken || embedToken !== embedSecret) {
      return res.status(401).json({ error: "Invalid or missing embed token" });
    }
  }
  
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Cookie parser with secret for signed cookies (age verification)
  // SESSION_SECRET is required for signed cookies - log warning if not set
  const cookieSecret = process.env.SESSION_SECRET;
  if (!cookieSecret) {
    console.warn("[Security] SESSION_SECRET not set - signed cookies will be insecure in development");
  }
  app.use(cookieParser(cookieSecret || undefined));
  
  // Initialize push notifications
  initializePushNotifications();
  
  // Embed API routes with CORS support
  app.options("/api/embed/*", embedCors);
  
  app.get("/api/embed/price-history", embedCors, embedLimiter, validateEmbedToken, async (req, res) => {
    try {
      const timeRange = (req.query.range as string) || "24h";
      
      let history;
      if (timeRange === "live") {
        history = getPriceHistory();
      } else {
        history = await fetchHistoricalPrices(timeRange);
      }
      
      if (handleConditionalGet(req, res, history, 10)) return;
      res.json(history);
    } catch (error) {
      console.error("[Embed] Price history error:", error);
      res.status(500).json({ error: "Failed to fetch price history" });
    }
  });
  
  app.get("/api/embed/metrics", embedCors, embedLimiter, validateEmbedToken, async (req, res) => {
    try {
      const metrics = await fetchTokenMetrics();
      const embedMetrics = {
        price: metrics.price,
        priceChange24h: metrics.priceChange24h,
        marketCap: metrics.marketCap,
        marketCapChange24h: metrics.marketCapChange24h,
        volume24h: metrics.volume24h,
        liquidity: metrics.liquidity,
        totalSupply: metrics.totalSupply,
        circulatingSupply: metrics.circulatingSupply,
        burnedTokens: metrics.burnedTokens,
        lockedTokens: metrics.lockedTokens,
        holders: metrics.holders,
        lastUpdated: metrics.lastUpdated,
      };
      if (handleConditionalGet(req, res, embedMetrics, 10, ["lastUpdated"])) return;
      res.json(embedMetrics);
    } catch (error) {
      console.error("[Embed] Metrics error:", error);
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });
  
  app.get("/api/embed/config", embedCors, (_req, res) => {
    res.json({
      version: "1.0.2",
      tokenSymbol: "NORMIE",
      tokenName: "Normie",
      refreshInterval: 10000,
      availableRanges: ["live", "5m", "1h", "6h", "24h", "7d", "all"],
    });
  });

  app.get("/api/embed/chart-markers", embedCors, embedLimiter, validateEmbedToken, async (req, res) => {
    try {
      const range = req.query.range as string;
      let startDate: Date | undefined;
      
      if (range === "all") {
        startDate = undefined;
      } else if (range) {
        const now = new Date();
        switch (range) {
          case "live":
          case "5m":
          case "1h":
          case "6h":
          case "24h": startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
          case "7d": startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
          case "30d": startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
          default: startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }
      }
      
      const devBuys = startDate 
        ? await storage.getStoredDevBuysInRange(startDate, new Date())
        : await storage.getAllStoredDevBuys();
      
      const whaleBuys = startDate
        ? await storage.getWhaleBuysInRange(startDate, new Date())
        : await storage.getAllWhaleBuys();
      
      const markers = [
        ...devBuys.map(buy => ({
          type: "dev" as const,
          signature: buy.signature,
          timestamp: new Date(buy.timestamp).getTime(),
          amount: parseFloat(buy.amount),
          price: parseFloat(buy.price),
        })),
        ...whaleBuys.map(buy => ({
          type: "whale" as const,
          signature: buy.signature,
          walletAddress: buy.walletAddress,
          timestamp: new Date(buy.timestamp).getTime(),
          amount: parseFloat(buy.amount),
          price: parseFloat(buy.price),
          percentOfSupply: parseFloat(buy.percentOfSupply),
        })),
      ].sort((a, b) => a.timestamp - b.timestamp);
      
      if (handleConditionalGet(req, res, markers, 30)) return;
      res.json(markers);
    } catch (error) {
      console.error("[Embed] Chart markers error:", error);
      res.status(500).json({ error: "Failed to fetch chart markers" });
    }
  });
  
  // Embed leaderboard endpoints with CORS support
  app.get("/api/embed/leaderboard/diamond", embedCors, embedLimiter, validateEmbedToken, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const leaderboard = await storage.getDiamondHandsLeaderboard(limit);
      if (handleConditionalGet(req, res, leaderboard, 30)) return;
      res.json(leaderboard);
    } catch (error) {
      console.error("[Embed] Diamond hands leaderboard error:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/embed/leaderboard/whales", embedCors, embedLimiter, validateEmbedToken, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const leaderboard = await storage.getWhalesLeaderboard(limit);
      if (handleConditionalGet(req, res, leaderboard, 30)) return;
      res.json(leaderboard);
    } catch (error) {
      console.error("[Embed] Whales leaderboard error:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/embed/leaderboard/jeets", embedCors, embedLimiter, validateEmbedToken, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const leaderboard = await storage.getJeetLeaderboard(limit, "all");
      if (handleConditionalGet(req, res, leaderboard, 30)) return;
      res.json(leaderboard);
    } catch (error) {
      console.error("[Embed] Jeets leaderboard error:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // Historical chart data from database (optimized - reduces external API calls)
  app.get("/api/chart/:tokenAddress", apiLimiter, async (req, res) => {
    try {
      const { tokenAddress } = req.params;
      const timeframe = (req.query.timeframe as string) || "24h";
      
      res.set("Cache-Control", "public, max-age=30");
      
      const chartData = await smartDataFetcher.getHistoricalPrices(
        tokenAddress,
        timeframe
      );
      
      res.json({
        tokenAddress,
        timeframe,
        data: chartData,
        fromDatabase: true,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chart data" });
    }
  });

  // Smart metrics fetch with caching (reduces external API calls by ~99%)
  app.get("/api/smart-metrics", apiLimiter, async (_req, res) => {
    try {
      res.set("Cache-Control", "public, max-age=15");
      
      const result = await smartDataFetcher.fetchTokenMetrics();
      const interval = await smartDataFetcher.determinePollInterval(NORMIE_TOKEN.address);
      
      // Parse DexScreener response format
      const pair = result.data?.pairs?.[0];
      if (!pair) {
        return res.status(503).json({ error: "Token data unavailable" });
      }
      
      res.json({
        price: parseFloat(pair.priceUsd || "0"),
        priceChange24h: parseFloat(pair.priceChange?.h24 || "0"),
        marketCap: parseFloat(pair.marketCap || pair.fdv || "0"),
        volume24h: parseFloat(pair.volume?.h24 || "0"),
        liquidity: parseFloat(pair.liquidity?.usd || "0"),
        fromCache: result.fromCache,
        changed: result.changed,
        recommendedPollInterval: interval,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });

  // HTML escape helper for safe email content
  function escapeHtml(str: string): string {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Bug report validation schema
  const bugReportRequestSchema = z.object({
    description: z.string().min(1).max(5000),
    pageUrl: z.string().url().max(2000),
    screenshot: z.string().max(5000000).optional(),
    userAgent: z.string().max(500).optional(),
    imageAudit: z.object({
      totalImages: z.number(),
      brokenImages: z.array(z.object({ src: z.string(), alt: z.string() })),
      timestamp: z.number(),
    }).optional(),
    brokenImages: z.array(z.object({ src: z.string(), alt: z.string() })).optional(),
    viewport: z.object({
      width: z.number(),
      height: z.number(),
      devicePixelRatio: z.number().optional(),
    }).optional(),
    performanceMetrics: z.object({
      memory: z.number().optional(),
      timing: z.number().optional(),
    }).optional(),
  });

  // Bug report submission endpoint
  app.post("/api/bug-report", apiLimiter, async (req, res) => {
    try {
      const validation = bugReportRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid request data", details: validation.error.issues });
      }

      const {
        description,
        screenshot,
        pageUrl,
        userAgent,
        imageAudit,
        brokenImages,
        viewport,
        performanceMetrics,
      } = validation.data;

      const [report] = await db
        .insert(bugReports)
        .values({
          description,
          pageUrl,
          userAgent,
          screenshotData: screenshot,
          imageAudit: imageAudit ? JSON.stringify(imageAudit) : null,
          brokenImagesCount: brokenImages?.length || 0,
          viewport: viewport ? JSON.stringify(viewport) : null,
          performanceMetrics: performanceMetrics ? JSON.stringify(performanceMetrics) : null,
          status: "open",
        })
        .returning();

      // Send email notification via SendGrid with sanitized content
      if (process.env.SENDGRID_API_KEY) {
        try {
          const viewportStr = viewport ? `${viewport.width}x${viewport.height}` : "unknown";
          const brokenCount = brokenImages?.length || 0;
          const safeDescription = escapeHtml(description);
          const safePageUrl = escapeHtml(pageUrl);
          const safeUserAgent = escapeHtml(userAgent || "unknown");

          await sgMail.send({
            to: SUPPORT_EMAIL,
            from: BUG_REPORT_FROM_EMAIL,
            subject: `[Bug Report] normie.observer - ${report.id.slice(0, 8)}`,
            html: `
              <div style="font-family: system-ui, sans-serif; padding: 20px;">
                <h2 style="color: #00ff00;">New Bug Report</h2>
                <p><strong>Report ID:</strong> ${report.id}</p>
                <p><strong>Page:</strong> ${safePageUrl}</p>
                <p><strong>Viewport:</strong> ${viewportStr}</p>
                <p><strong>Broken Images:</strong> ${brokenCount}</p>
                <hr style="border: 1px solid #333; margin: 20px 0;" />
                <h3>Description:</h3>
                <p style="background: #f5f5f5; padding: 15px; border-radius: 8px;">${safeDescription}</p>
                <hr style="border: 1px solid #333; margin: 20px 0;" />
                <p style="font-size: 12px; color: #666;">
                  <strong>User Agent:</strong><br/>${safeUserAgent}
                </p>
                ${screenshot ? '<p style="font-size: 12px; color: #666;">Screenshot attached to database record.</p>' : ""}
              </div>
            `,
          });
        } catch (emailError) {
          // Email failure shouldn't fail the report submission
        }
      }

      res.json({ success: true, reportId: report.id });
    } catch (error) {
      res.status(500).json({ error: "Failed to submit bug report" });
    }
  });

  // Get bug reports (admin only)
  app.get("/api/bug-reports", requireAdmin, async (_req, res) => {
    try {
      const reports = await db
        .select()
        .from(bugReports)
        .orderBy(desc(bugReports.createdAt))
        .limit(100);

      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bug reports" });
    }
  });

  // Auth routes use per-endpoint rate limiting (see authRoutes.ts)
  app.use("/api/auth", authRoutes);
  
  app.use("/api", apiLimiter);

  registerObjectStorageRoutes(app);

  // Health check endpoint - validates database connectivity and table existence
  // Simple ping endpoint for basic health checks - always returns 200
  app.get("/api/ping", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Comprehensive health check - returns 200 even if database is down
  // This allows the app to pass deployment health checks while database issues are resolved
  app.get("/api/health", async (_req, res) => {
    const startTime = Date.now();
    const checks: Record<string, { status: string; message?: string; duration?: number }> = {};

    // Check database connection with timeout
    const dbStart = Date.now();
    let dbConnected = false;
    try {
      // Use a 5-second timeout for the database check
      const timeoutPromise = new Promise<boolean>((_, reject) => 
        setTimeout(() => reject(new Error("Database check timeout")), 5000)
      );
      dbConnected = await Promise.race([verifyDatabaseConnection(), timeoutPromise]);
      checks.database = {
        status: dbConnected ? "healthy" : "degraded",
        message: dbConnected ? "Connected" : "Connection failed",
        duration: Date.now() - dbStart,
      };
    } catch (dbError: any) {
      checks.database = {
        status: "degraded",
        message: dbError.message || "Connection failed",
        duration: Date.now() - dbStart,
      };
    }

    // Only check tables and data if database is connected
    if (dbConnected) {
      // Check tables exist
      const tableStart = Date.now();
      try {
        const tableCheck = await checkTablesExist();
        checks.tables = {
          status: tableCheck.exists ? "healthy" : "degraded",
          message: tableCheck.exists 
            ? "All tables present" 
            : `Missing: ${tableCheck.missing.join(", ")}`,
          duration: Date.now() - tableStart,
        };
      } catch (tableError: any) {
        checks.tables = {
          status: "degraded",
          message: tableError.message,
          duration: Date.now() - tableStart,
        };
      }

      // Check polls endpoint
      const pollsStart = Date.now();
      try {
        const polls = await storage.getActivePolls();
        checks.polls = {
          status: "healthy",
          message: `${polls.length} active polls`,
          duration: Date.now() - pollsStart,
        };
      } catch (pollError: any) {
        checks.polls = {
          status: "degraded",
          message: pollError.message,
          duration: Date.now() - pollsStart,
        };
      }

      // Check admin user exists
      const adminStart = Date.now();
      try {
        const admin = await storage.getUserByUsername("Normie");
        checks.adminUser = {
          status: admin ? "healthy" : "warning",
          message: admin ? "Admin user exists" : "Admin user missing",
          duration: Date.now() - adminStart,
        };
      } catch (adminError: any) {
        checks.adminUser = {
          status: "degraded",
          message: adminError.message,
          duration: Date.now() - adminStart,
        };
      }
    } else {
      checks.tables = { status: "skipped", message: "Database unavailable" };
      checks.polls = { status: "skipped", message: "Database unavailable" };
      checks.adminUser = { status: "skipped", message: "Database unavailable" };
    }

    const allHealthy = Object.values(checks).every(c => c.status === "healthy");
    const hasDegraded = Object.values(checks).some(c => c.status === "degraded");
    const hasWarnings = Object.values(checks).some(c => c.status === "warning");

    // Always return 200 so deployment health checks pass
    // Use status field to indicate actual health
    res.status(200).json({
      status: allHealthy ? "healthy" : hasDegraded ? "degraded" : hasWarnings ? "warning" : "healthy",
      environment: getEnvironmentName(),
      timestamp: new Date().toISOString(),
      totalDuration: Date.now() - startTime,
      checks,
    });
  });
  
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
  
  app.get("/api/metrics", async (req, res) => {
    try {
      const metrics = await fetchTokenMetrics();
      if (handleConditionalGet(req, res, metrics, 5, ["lastUpdated"])) return;
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });
  
  app.get("/api/price-history", async (req, res) => {
    try {
      const timeRange = (req.query.range as string) || "live";
      
      let history;
      if (timeRange === "live") {
        history = getPriceHistory();
      } else {
        history = await fetchHistoricalPrices(timeRange);
      }
      
      if (handleConditionalGet(req, res, history, 10)) return;
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch price history" });
    }
  });
  
  app.get("/api/dev-buys", async (req, res) => {
    try {
      let apiDevBuys: ReturnType<typeof getDevBuys> = [];
      try {
        apiDevBuys = getDevBuys();
      } catch (err) {
        console.error("[DevBuys] Error fetching API dev buys:", err);
      }
      
      let manualDevBuysFormatted: Array<{
        signature: string;
        timestamp: number;
        amount: number;
        price: number;
        label: string | null;
        isManual: boolean;
      }> = [];
      
      try {
        const manualBuys = await db.select().from(manualDevBuys);
        manualDevBuysFormatted = manualBuys
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
      } catch (err) {
        console.error("[DevBuys] Error fetching manual dev buys from DB:", err);
      }
      
      const allBuys = [...apiDevBuys, ...manualDevBuysFormatted].sort((a, b) => b.timestamp - a.timestamp);
      if (handleConditionalGet(req, res, allBuys, 30)) return;
      res.json(allBuys);
    } catch (error) {
      console.error("[DevBuys] Unexpected error:", error);
      res.status(500).json({ error: "Failed to fetch dev buys" });
    }
  });

  // Get dev/Normie wallet holdings
  app.get("/api/dev-wallet", async (_req, res) => {
    try {
      res.set("Cache-Control", "public, max-age=60");
      const holdings = await fetchDevWalletHoldings();
      res.json({
        ...holdings,
        walletAddress: getDevWalletAddress(),
        walletLabel: "Normie Wallet",
      });
    } catch (error) {
      console.error("[DevWallet] Error:", error);
      res.status(500).json({ error: "Failed to fetch dev wallet holdings" });
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

  // Get whale buys for chart display
  app.get("/api/whale-buys", async (req, res) => {
    try {
      res.set("Cache-Control", "no-store, no-cache, must-revalidate");
      res.set("Pragma", "no-cache");
      
      const limit = parseInt(req.query.limit as string) || 50;
      const whaleBuys = await storage.getWhaleBuys(limit);
      
      const formatted = whaleBuys.map(buy => ({
        signature: buy.signature,
        walletAddress: buy.walletAddress,
        timestamp: new Date(buy.timestamp).getTime(),
        amount: parseFloat(buy.amount),
        price: parseFloat(buy.price),
        solSpent: buy.solSpent ? parseFloat(buy.solSpent) : null,
        percentOfSupply: parseFloat(buy.percentOfSupply),
      }));
      
      res.json(formatted);
    } catch (error) {
      console.error("[WhaleBuys] Error fetching:", error);
      res.status(500).json({ error: "Failed to fetch whale buys" });
    }
  });

  // Get stored dev buys (from database, for historical view)
  app.get("/api/stored-dev-buys", async (req, res) => {
    try {
      res.set("Cache-Control", "no-store, no-cache, must-revalidate");
      res.set("Pragma", "no-cache");
      
      const limit = parseInt(req.query.limit as string) || 50;
      const storedBuys = await storage.getStoredDevBuys(limit);
      
      const formatted = storedBuys.map(buy => ({
        signature: buy.signature,
        timestamp: new Date(buy.timestamp).getTime(),
        amount: parseFloat(buy.amount),
        price: parseFloat(buy.price),
        solSpent: buy.solSpent ? parseFloat(buy.solSpent) : null,
        isDevBuy: true,
      }));
      
      res.json(formatted);
    } catch (error) {
      console.error("[StoredDevBuys] Error fetching:", error);
      res.status(500).json({ error: "Failed to fetch stored dev buys" });
    }
  });

  // Get all chart markers (dev buys + whale buys combined)
  app.get("/api/chart-markers", async (req, res) => {
    try {
      res.set("Cache-Control", "no-store, no-cache, must-revalidate");
      res.set("Pragma", "no-cache");
      
      const range = req.query.range as string;
      let startDate: Date | undefined;
      
      if (range === "all") {
        // No date filter for all-time view
        startDate = undefined;
      } else if (range) {
        const now = new Date();
        switch (range) {
          case "24h": startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
          case "7d": startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
          case "30d": startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
          default: startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }
      }
      
      // Fetch dev buys
      const devBuys = startDate 
        ? await storage.getStoredDevBuysInRange(startDate, new Date())
        : await storage.getAllStoredDevBuys();
      
      // Fetch whale buys
      const whaleBuys = startDate
        ? await storage.getWhaleBuysInRange(startDate, new Date())
        : await storage.getAllWhaleBuys();
      
      const markers = [
        ...devBuys.map(buy => ({
          type: "dev" as const,
          signature: buy.signature,
          timestamp: new Date(buy.timestamp).getTime(),
          amount: parseFloat(buy.amount),
          price: parseFloat(buy.price),
        })),
        ...whaleBuys.map(buy => ({
          type: "whale" as const,
          signature: buy.signature,
          walletAddress: buy.walletAddress,
          timestamp: new Date(buy.timestamp).getTime(),
          amount: parseFloat(buy.amount),
          price: parseFloat(buy.price),
          percentOfSupply: parseFloat(buy.percentOfSupply),
        })),
      ].sort((a, b) => a.timestamp - b.timestamp);
      
      res.json(markers);
    } catch (error) {
      console.error("[ChartMarkers] Error fetching:", error);
      res.status(500).json({ error: "Failed to fetch chart markers" });
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
  // Public Icons/Favicons Routes
  // =====================================================
  
  // Get active favicons (public endpoint for users to select)
  app.get("/api/icons", async (_req, res) => {
    try {
      const activeIcons = await storage.getActiveIcons();
      res.json(activeIcons.map(icon => ({
        id: icon.id,
        name: icon.name,
        fileUrl: icon.fileUrl,
      })));
    } catch (error) {
      console.error("[Icons] Error fetching active icons:", error);
      res.status(500).json({ error: "Failed to fetch icons" });
    }
  });

  // =====================================================
  // Community Polls Routes
  // =====================================================
  
  app.get("/api/polls", async (_req, res) => {
    const requestId = `polls-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    try {
      console.log(`[Polls:${requestId}] Fetching active polls from database...`);
      
      const activePolls = await storage.getActivePolls();
      
      console.log(`[Polls:${requestId}] Found ${activePolls.length} active polls`);
      
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
    } catch (error: any) {
      console.error(`[Polls:${requestId}] ERROR fetching polls:`, error.message);
      console.error(`[Polls:${requestId}] Stack trace:`, error.stack);
      console.error(`[Polls:${requestId}] Environment: ${getEnvironmentName()}`);
      res.status(500).json({ 
        error: "Failed to fetch polls",
        requestId,
        environment: getEnvironmentName()
      });
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

  // Admin: Get user stats
  app.get("/api/admin/stats", requireAdmin, async (_req, res) => {
    try {
      const totalUsers = await storage.countUsers();
      res.json({ totalUsers });
    } catch (error) {
      console.error("[Admin] Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Admin: Get all polls (including inactive)
  app.get("/api/admin/polls", requireAdmin, async (_req, res) => {
    try {
      const allPolls = await storage.getAllPolls();
      const pollsFormatted = allPolls.map(poll => ({
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
        createdAt: poll.createdAt?.toISOString(),
      }));
      res.json(pollsFormatted);
    } catch (error) {
      console.error("[Admin] Error fetching all polls:", error);
      res.status(500).json({ error: "Failed to fetch polls" });
    }
  });

  // Admin: Create poll
  app.post("/api/admin/polls", requireAdmin, async (req, res) => {
    try {
      const { question, options, durationHours } = req.body;
      
      if (!question || !options || !Array.isArray(options) || options.length < 2) {
        return res.status(400).json({ error: "Question and at least 2 options are required" });
      }
      
      // Calculate endsAt based on duration
      const endsAt = durationHours 
        ? new Date(Date.now() + parseInt(durationHours) * 60 * 60 * 1000)
        : undefined;
      
      const poll = await storage.createPoll(
        { question, isActive: true, createdBy: (req as any).userId, endsAt },
        options
      );
      
      // Send push notifications for new poll (async, don't wait)
      sendPushNotificationForNewPoll(poll.id, question).catch(err => {
        console.error("[Admin] Error sending push notifications:", err);
      });
      
      res.json(poll);
    } catch (error) {
      console.error("[Admin] Error creating poll:", error);
      res.status(500).json({ error: "Failed to create poll" });
    }
  });

  // Admin: Delete poll
  app.delete("/api/admin/polls/:pollId", requireAdmin, async (req, res) => {
    try {
      const { pollId } = req.params;
      await storage.deletePoll(pollId);
      res.json({ success: true });
    } catch (error) {
      console.error("[Admin] Error deleting poll:", error);
      res.status(500).json({ error: "Failed to delete poll" });
    }
  });

  // Admin: Send stream notification
  app.post("/api/admin/stream-notification", requireAdmin, async (req, res) => {
    try {
      const { title, message, streamUrl } = req.body;
      
      if (!title || !message) {
        return res.status(400).json({ error: "Title and message are required" });
      }
      
      if (title.length > 100) {
        return res.status(400).json({ error: "Title must be 100 characters or less" });
      }
      
      if (message.length > 500) {
        return res.status(400).json({ error: "Message must be 500 characters or less" });
      }
      
      const result = await sendStreamNotification(title, message, streamUrl);
      res.json({ 
        success: true, 
        sent: result.sent, 
        failed: result.failed,
        message: `Notification sent to ${result.sent} subscribers` 
      });
    } catch (error) {
      console.error("[Admin] Error sending stream notification:", error);
      res.status(500).json({ error: "Failed to send stream notification" });
    }
  });

  // =====================================================
  // Admin: User Management Routes
  // =====================================================

  // Admin: Get all users with stats
  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    try {
      const usersWithStats = await storage.getAllUsersWithStats();
      res.json(usersWithStats.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        walletAddress: u.walletAddress,
        role: u.role,
        avatarUrl: u.avatarUrl,
        bannedAt: u.bannedAt?.toISOString(),
        createdAt: u.createdAt?.toISOString(),
        messageCount: u.messageCount,
        galleryCount: u.galleryCount,
      })));
    } catch (error) {
      console.error("[Admin] Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Admin: Get user details with content
  app.get("/api/admin/users/:userId", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const [messages, gallery] = await Promise.all([
        storage.getUserChatMessages(userId, 50),
        storage.getUserGalleryItems(userId),
      ]);
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          walletAddress: user.walletAddress,
          role: user.role,
          avatarUrl: user.avatarUrl,
          bannedAt: user.bannedAt?.toISOString(),
          createdAt: user.createdAt?.toISOString(),
        },
        messages: messages.map(m => ({
          id: m.id,
          content: m.content,
          roomId: m.roomId,
          createdAt: m.createdAt?.toISOString(),
        })),
        gallery: gallery.map(g => ({
          id: g.id,
          title: g.title,
          imageUrl: g.imageUrl,
          status: g.status,
          createdAt: g.createdAt?.toISOString(),
        })),
      });
    } catch (error) {
      console.error("[Admin] Error fetching user details:", error);
      res.status(500).json({ error: "Failed to fetch user details" });
    }
  });

  // Admin: Ban user (supports temporary bans with duration in hours)
  app.post("/api/admin/users/:userId/ban", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { duration } = req.body; // Duration in hours, undefined/null = permanent ban
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      if (user.role === "admin" || user.role === "founder") {
        return res.status(400).json({ error: "Cannot ban admin or founder users" });
      }
      
      // Calculate bannedUntil if duration is provided
      let bannedUntil: Date | null = null;
      if (duration && typeof duration === "number" && duration > 0) {
        bannedUntil = new Date(Date.now() + duration * 60 * 60 * 1000);
      }
      
      await storage.banUser(userId, bannedUntil);
      await storage.deleteUserSessions(userId);
      
      const message = bannedUntil 
        ? `User banned until ${bannedUntil.toISOString()}`
        : "User banned permanently";
      res.json({ success: true, message, bannedUntil: bannedUntil?.toISOString() });
    } catch (error) {
      console.error("[Admin] Error banning user:", error);
      res.status(500).json({ error: "Failed to ban user" });
    }
  });

  // Admin: Unban user
  app.post("/api/admin/users/:userId/unban", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      await storage.unbanUser(userId);
      res.json({ success: true, message: "User unbanned" });
    } catch (error) {
      console.error("[Admin] Error unbanning user:", error);
      res.status(500).json({ error: "Failed to unban user" });
    }
  });

  // Admin: Change username
  app.patch("/api/admin/users/:userId/username", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { username } = req.body;
      
      if (!username || username.length < 3 || username.length > 50) {
        return res.status(400).json({ error: "Username must be 3-50 characters" });
      }
      
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ error: "Username must be alphanumeric with underscores only" });
      }
      
      const existing = await storage.getUserByUsername(username);
      if (existing && existing.id !== userId) {
        return res.status(400).json({ error: "Username already taken" });
      }
      
      const updated = await storage.updateUser(userId, { username });
      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ success: true, username: updated.username });
    } catch (error) {
      console.error("[Admin] Error changing username:", error);
      res.status(500).json({ error: "Failed to change username" });
    }
  });

  // Admin: Send forgot password email to user
  app.post("/api/admin/users/:userId/send-reset", requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (!user.email) {
        return res.status(400).json({ error: "User has no email address" });
      }
      
      const { generatePasswordResetToken } = await import("./auth");
      const sgMail = await import("@sendgrid/mail");
      
      const token = generatePasswordResetToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      
      await storage.createPasswordResetToken({
        userId: user.id,
        token,
        expiresAt,
      });
      
      if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
        sgMail.default.setApiKey(process.env.SENDGRID_API_KEY);
        const resetLink = `${process.env.APP_URL || "https://normienation.replit.app"}/reset-password?token=${token}`;
        
        await sgMail.default.send({
          to: user.email,
          from: process.env.SENDGRID_FROM_EMAIL,
          subject: "Password Reset Request - Normie Nation",
          html: `
            <html>
            <body style="background: #0a0a0a; color: #e0e0e0; font-family: 'Segoe UI', sans-serif; padding: 40px 20px;">
              <div style="max-width: 600px; margin: 0 auto;">
                <h1 style="color: #00ff00; font-family: monospace;">$NORMIE</h1>
                <p style="font-size: 16px;">An admin has initiated a password reset for your account.</p>
                <p style="font-size: 16px;">Click the button below to reset your password:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetLink}" style="display: inline-block; background: #00ff00; color: #000; font-weight: bold; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-family: monospace;">RESET PASSWORD</a>
                </div>
                <p style="font-size: 14px; color: #888;">This link expires in 1 hour.</p>
              </div>
            </body>
            </html>
          `,
        });
        
        res.json({ success: true, message: "Password reset email sent" });
      } else {
        res.status(500).json({ error: "Email service not configured" });
      }
    } catch (error) {
      console.error("[Admin] Error sending reset email:", error);
      res.status(500).json({ error: "Failed to send reset email" });
    }
  });

  // Admin: Force logout all users
  app.post("/api/admin/logout-all", requireAdmin, async (req, res) => {
    try {
      const count = await storage.deleteAllSessions();
      res.json({ success: true, message: `Logged out all users (${count} sessions deleted)` });
    } catch (error) {
      console.error("[Admin] Error logging out all users:", error);
      res.status(500).json({ error: "Failed to logout all users" });
    }
  });

  // =====================================================
  // Admin: Favicon/Icon Management Routes
  // =====================================================

  // Admin: Get all favicons
  app.get("/api/admin/favicons", requireAdmin, async (_req, res) => {
    try {
      const allIcons = await storage.getAllIcons();
      res.json(allIcons.map(icon => ({
        id: icon.id,
        name: icon.name,
        fileUrl: icon.fileUrl,
        isActive: icon.isActive,
        createdAt: icon.createdAt?.toISOString(),
      })));
    } catch (error) {
      console.error("[Admin] Error fetching favicons:", error);
      res.status(500).json({ error: "Failed to fetch favicons" });
    }
  });

  // Admin: Add favicon
  app.post("/api/admin/favicons", requireAdmin, async (req, res) => {
    try {
      const { name, fileUrl } = req.body;
      
      if (!name || !fileUrl) {
        return res.status(400).json({ error: "Name and file URL are required" });
      }
      
      const icon = await storage.createIcon({
        name,
        fileUrl,
        uploadedBy: (req as any).userId,
        isActive: true,
      });
      
      res.json({
        id: icon.id,
        name: icon.name,
        fileUrl: icon.fileUrl,
        isActive: icon.isActive,
        createdAt: icon.createdAt?.toISOString(),
      });
    } catch (error) {
      console.error("[Admin] Error creating favicon:", error);
      res.status(500).json({ error: "Failed to create favicon" });
    }
  });

  // Admin: Toggle favicon active status
  app.patch("/api/admin/favicons/:iconId", requireAdmin, async (req, res) => {
    try {
      const { iconId } = req.params;
      const { isActive, name } = req.body;
      
      const updates: Record<string, any> = {};
      if (isActive !== undefined) updates.isActive = isActive;
      if (name !== undefined) updates.name = name;
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }
      
      const updated = await storage.updateIcon(iconId, updates);
      if (!updated) {
        return res.status(404).json({ error: "Favicon not found" });
      }
      
      res.json({
        id: updated.id,
        name: updated.name,
        fileUrl: updated.fileUrl,
        isActive: updated.isActive,
      });
    } catch (error) {
      console.error("[Admin] Error updating favicon:", error);
      res.status(500).json({ error: "Failed to update favicon" });
    }
  });

  // Admin: Delete favicon
  app.delete("/api/admin/favicons/:iconId", requireAdmin, async (req, res) => {
    try {
      const { iconId } = req.params;
      await storage.deleteIcon(iconId);
      res.json({ success: true });
    } catch (error) {
      console.error("[Admin] Error deleting favicon:", error);
      res.status(500).json({ error: "Failed to delete favicon" });
    }
  });

  // Public: Get active favicons (for user selection)
  app.get("/api/favicons", async (_req, res) => {
    try {
      const activeIcons = await storage.getActiveIcons();
      res.json(activeIcons.map(icon => ({
        id: icon.id,
        name: icon.name,
        fileUrl: icon.fileUrl,
      })));
    } catch (error) {
      console.error("[Icons] Error fetching favicons:", error);
      res.status(500).json({ error: "Failed to fetch favicons" });
    }
  });

  // =====================================================
  // Activity Feed Routes
  // =====================================================
  
  app.get("/api/activity", async (req, res) => {
    try {
      const [dbActivity, tokenActivity] = await Promise.all([
        storage.getRecentActivity(20).catch(err => {
          console.error("[Activity] DB activity fetch failed:", err);
          return [];
        }),
        fetchRecentTokenActivity().catch(err => {
          console.error("[Activity] Token activity fetch failed:", err);
          return [];
        }),
      ]);
      
      let devBuys: ReturnType<typeof getDevBuys> = [];
      try {
        devBuys = getDevBuys().slice(0, 10);
      } catch (err) {
        console.error("[Activity] Dev buys fetch failed:", err);
      }
      const devBuyActivity = devBuys.map((buy) => ({
        id: `devbuy-${buy.signature.slice(0, 12)}`,
        type: "trade" as const,
        message: `Dev buy: ${(buy.amount / 1000000).toFixed(1)}M $NORMIE`,
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
      
      const allActivityItems = [
        ...formattedDbActivity,
        ...devBuyActivity,
        ...tokenActivity,
      ];
      
      const seenIds = new Set<string>();
      const uniqueActivity = allActivityItems.filter(item => {
        if (seenIds.has(item.id)) return false;
        seenIds.add(item.id);
        return true;
      });
      
      const sortedActivity = uniqueActivity
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 50);
      
      if (handleConditionalGet(req, res, sortedActivity, 10)) return;
      res.json(sortedActivity);
    } catch (error) {
      console.error("[Activity] Unexpected error fetching activity:", error);
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

  // =====================================================
  // Leaderboard Routes
  // =====================================================

  app.get("/api/leaderboard", async (req, res) => {
    try {
      const [topCreators, topChatters] = await Promise.all([
        storage.getTopMemeCreators(10),
        storage.getTopChatters(10),
      ]);
      
      const data = { topCreators, topChatters };
      if (handleConditionalGet(req, res, data, 60)) return;
      res.json(data);
    } catch (error) {
      console.error("[Leaderboard] Error fetching leaderboard:", error);
      res.json({ topCreators: [], topChatters: [] });
    }
  });

  app.get("/api/leaderboard/jeets", async (req, res) => {
    try {
      const range = (req.query.range as "24h" | "7d" | "30d" | "all") || "all";
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      
      const leaderboard = range === "all" 
        ? await storage.getJeetWalletTotalsLeaderboard(limit)
        : await storage.getJeetLeaderboard(limit, range);
      
      if (handleConditionalGet(req, res, leaderboard, 60)) return;
      res.json(leaderboard);
    } catch (error) {
      console.error("[Jeet Leaderboard] Error fetching jeet leaderboard:", error);
      res.json([]);
    }
  });
  
  // Get jeet tracking stats
  app.get("/api/leaderboard/jeets/stats", async (_req, res) => {
    try {
      const sellCount = await storage.getJeetSellCount();
      res.json({ 
        totalSellsTracked: sellCount,
        status: sellCount > 0 ? "tracking" : "awaiting_data"
      });
    } catch (error) {
      console.error("[Jeet Stats] Error:", error);
      res.json({ totalSellsTracked: 0, status: "error" });
    }
  });
  
  // Backfill historical jeet data (admin only)
  app.post("/api/admin/jeets/backfill", requireAdmin, async (req, res) => {
    try {
      const { backfillHistoricalJeets, isBackfillInProgress } = await import("./solana");
      
      if (isBackfillInProgress()) {
        return res.status(409).json({ error: "Backfill already in progress" });
      }
      
      const limit = Math.min(parseInt(req.body.limit as string) || 100, 500);
      
      console.log(`[Admin] Starting jeet backfill with limit ${limit}`);
      const result = await backfillHistoricalJeets(limit);
      
      res.json(result);
    } catch (error) {
      console.error("[Admin] Backfill error:", error);
      res.status(500).json({ error: "Failed to run backfill" });
    }
  });

  // =====================================================
  // Holder Leaderboard Routes (Diamond Hands & Whales)
  // =====================================================

  app.get("/api/leaderboard/holders/diamond", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const leaderboard = await storage.getDiamondHandsLeaderboard(limit);
      if (handleConditionalGet(req, res, leaderboard, 60)) return;
      res.json(leaderboard);
    } catch (error) {
      console.error("[Diamond Hands] Error fetching leaderboard:", error);
      res.json([]);
    }
  });

  app.get("/api/leaderboard/holders/whales", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const leaderboard = await storage.getWhalesLeaderboard(limit);
      if (handleConditionalGet(req, res, leaderboard, 60)) return;
      res.json(leaderboard);
    } catch (error) {
      console.error("[Whales] Error fetching leaderboard:", error);
      res.json([]);
    }
  });

  app.get("/api/leaderboard/holders/stats", async (_req, res) => {
    try {
      const buyCount = await storage.getWalletBuyCount();
      const holdingsCount = await storage.getWalletHoldingsCount();
      res.json({ 
        totalBuysTracked: buyCount,
        totalWalletsTracked: holdingsCount,
        status: holdingsCount > 0 ? "tracking" : "awaiting_data"
      });
    } catch (error) {
      console.error("[Holder Stats] Error:", error);
      res.json({ totalBuysTracked: 0, totalWalletsTracked: 0, status: "error" });
    }
  });

  // Backfill historical holder data (admin only)
  app.post("/api/admin/holders/backfill", requireAdmin, async (req, res) => {
    try {
      const { backfillHistoricalHolders, isHolderBackfillInProgress } = await import("./solana");
      
      if (isHolderBackfillInProgress()) {
        return res.status(409).json({ error: "Backfill already in progress" });
      }
      
      const limit = Math.min(parseInt(req.body.limit as string) || 100, 500);
      
      console.log(`[Admin] Starting holder backfill with limit ${limit}`);
      const result = await backfillHistoricalHolders(limit);
      
      res.json(result);
    } catch (error) {
      console.error("[Admin] Holder backfill error:", error);
      res.status(500).json({ error: "Failed to run holder backfill" });
    }
  });

  // Sync holder balances from Helius on-chain data (admin only)
  app.post("/api/admin/holders/sync", requireAdmin, async (req, res) => {
    try {
      const { syncHolderBalancesFromHelius } = await import("./solana");
      
      console.log(`[Admin] Starting holder sync from Helius...`);
      const result = await syncHolderBalancesFromHelius();
      
      res.json(result);
    } catch (error) {
      console.error("[Admin] Holder sync error:", error);
      res.status(500).json({ error: "Failed to sync holders" });
    }
  });

  // Clear and reset holder data (admin only)
  app.post("/api/admin/holders/reset", requireAdmin, async (req, res) => {
    try {
      // Clear wallet_holdings table
      await db.delete(walletHoldings);
      
      console.log(`[Admin] Cleared all holder data`);
      res.json({ success: true, message: "Holder data cleared" });
    } catch (error) {
      console.error("[Admin] Holder reset error:", error);
      res.status(500).json({ error: "Failed to reset holders" });
    }
  });

  // =====================================================
  // Art Gallery Routes
  // =====================================================

  app.get("/api/gallery", async (req, res) => {
    try {
      const featured = req.query.featured === "true";
      const items = await (featured 
        ? storage.getFeaturedGalleryItems()
        : storage.getApprovedGalleryItems(50)
      ).catch(err => {
        console.error("[Gallery] Database error fetching gallery:", err);
        return [];
      });
      res.json(items);
    } catch (error) {
      console.error("[Gallery] Unexpected error fetching gallery:", error);
      res.status(500).json({ error: "Failed to fetch gallery" });
    }
  });

  app.get("/api/gallery/featured", async (req, res) => {
    try {
      const items = await storage.getFeaturedGalleryItems().catch(err => {
        console.error("[Gallery] Database error fetching featured:", err);
        return [];
      });
      res.json(items);
    } catch (error) {
      console.error("[Gallery] Unexpected error fetching featured items:", error);
      res.status(500).json({ error: "Failed to fetch featured items" });
    }
  });

  // DISABLED: Legacy multer upload - use Object Storage instead
  // This endpoint is kept to return a helpful error for any old clients
  app.post("/api/gallery/upload", (_req: Request, res: Response) => {
    res.status(410).json({ 
      error: "This upload method is no longer available. Please use the new upload system.",
      hint: "Refresh the page to use the updated uploader."
    });
  });

  app.get("/api/gallery/:id", async (req, res) => {
    try {
      const item = await storage.getGalleryItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Gallery item not found" });
      }
      await storage.incrementGalleryViews(req.params.id);
      res.json(item);
    } catch (error) {
      console.error("[Gallery] Error fetching item:", error);
      res.status(500).json({ error: "Failed to fetch gallery item" });
    }
  });

  app.post("/api/gallery", async (req, res) => {
    try {
      const { title, description, imageUrl, tags, creatorName, creatorId } = req.body;
      
      if (!title || !imageUrl) {
        return res.status(400).json({ error: "Title and image URL are required" });
      }
      
      // Validate imageUrl is from our uploads directory, object storage, or external URL
      const isInternalPath = imageUrl.startsWith("/uploads/") || imageUrl.startsWith("/objects/");
      const isExternalUrl = imageUrl.startsWith("http://") || imageUrl.startsWith("https://");
      if (!isInternalPath && !isExternalUrl) {
        return res.status(400).json({ error: "Please upload an image or provide a valid URL" });
      }
      
      const item = await storage.createGalleryItem({
        title,
        description,
        imageUrl,
        tags: tags || [],
        creatorName,
        creatorId,
        status: "pending",
      });
      
      res.json(item);
    } catch (error) {
      console.error("[Gallery] Error creating item:", error);
      res.status(500).json({ error: "Failed to create gallery item" });
    }
  });

  app.post("/api/gallery/:id/vote", async (req, res) => {
    try {
      const { voteType, visitorId } = req.body;
      
      if (!voteType || !visitorId) {
        return res.status(400).json({ error: "Vote type and visitor ID are required" });
      }
      
      if (voteType !== "up" && voteType !== "down") {
        return res.status(400).json({ error: "Vote type must be 'up' or 'down'" });
      }
      
      await storage.voteGalleryItem(req.params.id, visitorId, voteType);
      const item = await storage.getGalleryItem(req.params.id);
      res.json(item);
    } catch (error) {
      console.error("[Gallery] Error voting:", error);
      res.status(500).json({ error: "Failed to vote" });
    }
  });

  app.get("/api/gallery/:id/voted", async (req, res) => {
    try {
      const visitorId = req.query.visitorId as string;
      if (!visitorId) {
        return res.status(400).json({ error: "Visitor ID is required" });
      }
      const vote = await storage.hasGalleryVoted(req.params.id, visitorId);
      res.json({ voted: !!vote, voteType: vote?.voteType });
    } catch (error) {
      console.error("[Gallery] Error checking vote:", error);
      res.status(500).json({ error: "Failed to check vote status" });
    }
  });

  app.get("/api/gallery/:id/comments", async (req, res) => {
    try {
      const comments = await storage.getGalleryComments(req.params.id);
      res.json(comments);
    } catch (error) {
      console.error("[Gallery] Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/gallery/:id/comments", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: "Comment content is required" });
      }
      
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const comment = await storage.createGalleryComment({
        galleryItemId: req.params.id,
        content,
        visitorName: req.user.username,
        userId: req.user.id,
      });
      
      res.json(comment);
    } catch (error) {
      console.error("[Gallery] Error creating comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // Admin Gallery Routes
  app.get("/api/admin/gallery/pending", requireAdmin, async (_req, res) => {
    try {
      const items = await storage.getPendingGalleryItems();
      res.json(items);
    } catch (error) {
      console.error("[Admin] Error fetching pending gallery:", error);
      res.status(500).json({ error: "Failed to fetch pending items" });
    }
  });

  // Admin: Direct upload artwork (skips approval)
  app.post("/api/admin/gallery/upload", requireAdmin, async (req, res) => {
    try {
      const { title, description, imageUrl, tags } = req.body;
      
      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ error: "Title is required" });
      }
      
      if (!imageUrl || typeof imageUrl !== "string") {
        return res.status(400).json({ error: "Image URL is required" });
      }
      
      // Validate imageUrl is from our uploads directory, object storage, or external URL
      const isInternalPath = imageUrl.startsWith("/uploads/") || imageUrl.startsWith("/objects/");
      const isExternalUrl = imageUrl.startsWith("http://") || imageUrl.startsWith("https://");
      if (!isInternalPath && !isExternalUrl) {
        return res.status(400).json({ error: "Please upload an image or provide a valid URL" });
      }
      
      const item = await storage.createGalleryItem({
        title: title.trim(),
        description: typeof description === "string" ? description.trim() : "",
        imageUrl,
        tags: Array.isArray(tags) ? tags.filter(t => typeof t === "string") : [],
        creatorName: "Admin",
        creatorId: (req as any).userId,
        status: "approved",
      });
      
      res.json(item);
    } catch (error) {
      console.error("[Admin] Error uploading gallery item:", error);
      res.status(500).json({ error: "Failed to upload item" });
    }
  });

  app.post("/api/admin/gallery/:id/approve", requireAdmin, async (req, res) => {
    try {
      // Get item before approving to get creator info
      const item = await storage.getGalleryItem(req.params.id);
      await storage.approveGalleryItem(req.params.id);
      
      // Send notification if the creator has a userId
      if (item?.creatorId) {
        const { sendArtworkApprovedNotification } = await import("./pushNotifications");
        sendArtworkApprovedNotification(item.creatorId, item.title, item.id).catch(err => {
          console.error("[Push] Error sending artwork approval notification:", err);
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("[Admin] Error approving gallery item:", error);
      res.status(500).json({ error: "Failed to approve item" });
    }
  });

  app.post("/api/admin/gallery/:id/reject", requireAdmin, async (req, res) => {
    try {
      const { reason } = req.body;
      const item = await storage.rejectGalleryItem(req.params.id, reason);
      
      // Send notification if the creator has a userId
      if (item?.creatorId) {
        const { sendArtworkRejectedNotification } = await import("./pushNotifications");
        sendArtworkRejectedNotification(item.creatorId, item.title, item.id, reason).catch(err => {
          console.error("[Push] Error sending artwork rejection notification:", err);
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("[Admin] Error rejecting gallery item:", error);
      res.status(500).json({ error: "Failed to reject item" });
    }
  });

  app.post("/api/admin/gallery/:id/feature", requireAdmin, async (req, res) => {
    try {
      const { featured } = req.body;
      await storage.featureGalleryItem(req.params.id, featured);
      res.json({ success: true });
    } catch (error) {
      console.error("[Admin] Error featuring gallery item:", error);
      res.status(500).json({ error: "Failed to feature item" });
    }
  });

  app.delete("/api/admin/gallery/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteGalleryItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("[Admin] Error deleting gallery item:", error);
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  app.delete("/api/admin/gallery/comments/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteGalleryComment(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("[Admin] Error deleting comment:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // =====================================================
  // Public Chat Routes
  // =====================================================

  app.get("/api/chat/rooms", async (_req, res) => {
    try {
      const rooms = await storage.getPublicChatRooms();
      res.json(rooms);
    } catch (error) {
      console.error("[Chat] Error fetching rooms:", error);
      res.status(500).json({ error: "Failed to fetch chat rooms" });
    }
  });

  app.get("/api/chat/rooms/:roomId/messages", async (req, res) => {
    try {
      const messages = await storage.getChatMessages(req.params.roomId, 100).catch(err => {
        console.error("[Chat] Database error fetching messages:", err);
        return [];
      });
      res.json(messages.reverse());
    } catch (error) {
      console.error("[Chat] Unexpected error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/chat/rooms/:roomId/messages", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { content } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Message content is required" });
      }
      
      if (content.length > 500) {
        return res.status(400).json({ error: "Message too long (max 500 chars)" });
      }
      
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const message = await storage.createChatMessage({
        roomId: req.params.roomId,
        content: content.trim(),
        senderId: req.user.id,
        senderName: req.user.username,
      });
      
      res.json(message);
    } catch (error) {
      console.error("[Chat] Error creating message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.post("/api/chat/rooms", async (req, res) => {
    try {
      const { name } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Room name is required" });
      }
      
      const room = await storage.createChatRoom({
        name,
        type: "public",
        creatorId: null,
      });
      
      res.json(room);
    } catch (error) {
      console.error("[Chat] Error creating room:", error);
      res.status(500).json({ error: "Failed to create chat room" });
    }
  });

  const STICKER_MANIFEST = [
    { id: "pepe-classic", name: "Classic Pepe", category: "normie", url: "https://i.kym-cdn.com/entries/icons/original/000/017/618/pepefroggie.jpg" },
    { id: "pepe-smug", name: "Smug Pepe", category: "normie", url: "https://em-content.zobj.net/thumbs/240/twitter/322/smirking-face_1f60f.png" },
    { id: "wojak-sad", name: "Sad Wojak", category: "normie", url: "https://i.kym-cdn.com/entries/icons/original/000/031/671/cover1.jpg" },
    { id: "wojak-chad", name: "GigaChad", category: "normie", url: "https://i.kym-cdn.com/photos/images/newsfeed/001/562/308/87f.jpg" },
    { id: "doge", name: "Doge", category: "normie", url: "https://i.kym-cdn.com/entries/icons/original/000/013/564/doge.jpg" },
    { id: "troll", name: "Troll Face", category: "normie", url: "https://i.kym-cdn.com/entries/icons/original/000/000/091/TrollFace.jpg" },
    { id: "stonks", name: "Stonks", category: "normie", url: "https://i.kym-cdn.com/entries/icons/original/000/029/959/Screen_Shot_2019-06-05_at_1.26.32_PM.jpg" },
    { id: "doomer", name: "Doomer", category: "normie", url: "https://i.kym-cdn.com/entries/icons/original/000/027/763/07B89120-B48D-45FB-AF1D-49AF6CD16790.jpeg" },
    { id: "bitcoin", name: "Bitcoin", category: "crypto", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/1200px-Bitcoin.svg.png" },
    { id: "ethereum", name: "Ethereum", category: "crypto", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Ethereum-icon-purple.svg/1200px-Ethereum-icon-purple.svg.png" },
    { id: "solana", name: "Solana", category: "crypto", url: "https://upload.wikimedia.org/wikipedia/en/b/b9/Solana_logo.png" },
    { id: "diamond", name: "Diamond", category: "crypto", url: "https://em-content.zobj.net/thumbs/240/twitter/322/gem-stone_1f48e.png" },
    { id: "rocket", name: "Rocket", category: "crypto", url: "https://em-content.zobj.net/thumbs/240/twitter/322/rocket_1f680.png" },
    { id: "fire", name: "Fire", category: "crypto", url: "https://em-content.zobj.net/thumbs/240/twitter/322/fire_1f525.png" },
    { id: "money", name: "Money", category: "crypto", url: "https://em-content.zobj.net/thumbs/240/twitter/322/money-bag_1f4b0.png" },
    { id: "moon", name: "Moon", category: "crypto", url: "https://em-content.zobj.net/thumbs/240/twitter/322/full-moon_1f315.png" },
    { id: "clover", name: "Clover", category: "brand", url: "https://em-content.zobj.net/thumbs/240/twitter/322/four-leaf-clover_1f340.png" },
    { id: "thumbsup", name: "Thumbs Up", category: "brand", url: "https://em-content.zobj.net/thumbs/240/twitter/322/thumbs-up_1f44d.png" },
    { id: "skull", name: "Skull", category: "brand", url: "https://em-content.zobj.net/thumbs/240/twitter/322/skull_1f480.png" },
    { id: "crown", name: "Crown", category: "brand", url: "https://em-content.zobj.net/thumbs/240/twitter/322/crown_1f451.png" },
  ];

  const stickerCache = new Map<string, { data: Buffer; contentType: string; fetchedAt: number }>();
  const STICKER_CACHE_TTL = 24 * 60 * 60 * 1000;

  app.get("/api/stickers", (_req, res) => {
    res.json(STICKER_MANIFEST.map(s => ({ id: s.id, name: s.name, category: s.category })));
  });

  app.get("/api/sticker-proxy/:stickerId", async (req, res) => {
    const { stickerId } = req.params;
    const maxRetries = 2;
    const timeout = 10000; // 10 second timeout
    
    try {
      const sticker = STICKER_MANIFEST.find(s => s.id === stickerId);
      
      if (!sticker) {
        return res.status(404).json({ error: "Sticker not found" });
      }

      // Check cache first
      const cached = stickerCache.get(stickerId);
      if (cached && Date.now() - cached.fetchedAt < STICKER_CACHE_TTL) {
        res.set({
          "Content-Type": cached.contentType,
          "Cache-Control": "public, max-age=86400",
          "Access-Control-Allow-Origin": "*",
        });
        return res.send(cached.data);
      }

      // Fetch with retry logic and timeout
      let lastError: any = null;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          const response = await fetch(sticker.url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "image/png,image/jpeg,image/gif,image/*,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.5",
              "Referer": sticker.url,
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const contentType = response.headers.get("content-type") || "image/png";
          const buffer = Buffer.from(await response.arrayBuffer());

          if (buffer.length > 5 * 1024 * 1024) {
            return res.status(413).json({ error: "Sticker too large" });
          }

          if (buffer.length < 100) {
            throw new Error("Response too small, likely an error page");
          }

          // Cache successful response
          stickerCache.set(stickerId, { data: buffer, contentType, fetchedAt: Date.now() });

          res.set({
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400",
            "Access-Control-Allow-Origin": "*",
          });
          return res.send(buffer);

        } catch (fetchError: any) {
          lastError = fetchError;
          console.error(`[Sticker] Attempt ${attempt}/${maxRetries} failed for ${stickerId}: ${fetchError.message}`);
          
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          }
        }
      }

      // All retries failed
      console.error(`[Sticker] All retries failed for ${stickerId}. URL: ${sticker.url}`);
      console.error(`[Sticker] Last error: ${lastError?.message}`);
      
      return res.status(502).json({ 
        error: "Failed to fetch sticker after retries",
        stickerId,
        details: lastError?.message || "Unknown error"
      });

    } catch (error: any) {
      console.error(`[Sticker] Unexpected proxy error for ${stickerId}:`, error.message);
      res.status(500).json({ error: "Failed to proxy sticker" });
    }
  });

  // =====================================================
  // Push Notifications & In-App Notifications
  // =====================================================

  // Get VAPID public key for push subscription
  app.get("/api/push/vapid-key", (_req, res) => {
    res.json({ 
      publicKey: getVapidPublicKey(),
      enabled: isPushEnabled()
    });
  });

  // Subscribe to push notifications
  app.post("/api/push/subscribe", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { endpoint, keys } = req.body;
      
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: "Invalid subscription data" });
      }

      await storage.createPushSubscription({
        userId: req.user!.id,
        endpoint,
        p256dhKey: keys.p256dh,
        authKey: keys.auth,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("[Push] Subscribe error:", error);
      res.status(500).json({ error: "Failed to subscribe" });
    }
  });

  // Unsubscribe from push notifications
  app.post("/api/push/unsubscribe", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { endpoint } = req.body;
      
      if (endpoint) {
        await storage.deletePushSubscription(endpoint);
      } else {
        await storage.deletePushSubscriptionsByUser(req.user!.id);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("[Push] Unsubscribe error:", error);
      res.status(500).json({ error: "Failed to unsubscribe" });
    }
  });

  // Get user notifications
  app.get("/api/notifications", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.user!.id);
      const unreadCount = await storage.getUnreadNotificationCount(req.user!.id);
      res.json({ notifications, unreadCount });
    } catch (error) {
      console.error("[Notifications] Error fetching:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Mark notification as read
  app.post("/api/notifications/:id/read", authMiddleware, async (req: AuthRequest, res) => {
    try {
      await storage.markNotificationRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("[Notifications] Error marking read:", error);
      res.status(500).json({ error: "Failed to mark as read" });
    }
  });

  // Mark all notifications as read
  app.post("/api/notifications/read-all", authMiddleware, async (req: AuthRequest, res) => {
    try {
      await storage.markAllNotificationsRead(req.user!.id);
      res.json({ success: true });
    } catch (error) {
      console.error("[Notifications] Error marking all read:", error);
      res.status(500).json({ error: "Failed to mark all as read" });
    }
  });

  // Update notification preferences
  app.patch("/api/user/notification-settings", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { notifyNewPolls, notifyPollResults, notifyAnnouncements, notifyWhaleAlerts, notifyJeetAlarms, notifyArtworkStatus } = req.body;
      
      const updateData: Record<string, boolean> = {};
      if (typeof notifyNewPolls === "boolean") updateData.notifyNewPolls = notifyNewPolls;
      if (typeof notifyPollResults === "boolean") updateData.notifyPollResults = notifyPollResults;
      if (typeof notifyAnnouncements === "boolean") updateData.notifyAnnouncements = notifyAnnouncements;
      if (typeof notifyWhaleAlerts === "boolean") updateData.notifyWhaleAlerts = notifyWhaleAlerts;
      if (typeof notifyJeetAlarms === "boolean") updateData.notifyJeetAlarms = notifyJeetAlarms;
      if (typeof notifyArtworkStatus === "boolean") updateData.notifyArtworkStatus = notifyArtworkStatus;

      const updated = await storage.updateUser(req.user!.id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("[User] Error updating notification settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // =====================================================
  // User Feedback Routes
  // =====================================================

  // Submit feedback (public - no auth required)
  app.post("/api/feedback", async (req: Request, res) => {
    try {
      const parsed = insertUserFeedbackSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid feedback data", details: parsed.error.flatten() });
      }

      const [feedback] = await db
        .insert(userFeedback)
        .values(parsed.data)
        .returning();

      console.log("[Feedback] New submission:", feedback.title);
      res.status(201).json({ success: true, id: feedback.id });
    } catch (error) {
      console.error("[Feedback] Error submitting:", error);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  // Get all feedback (admin only)
  app.get("/api/admin/feedback", requireAdmin, async (_req, res) => {
    try {
      const feedbackList = await db
        .select()
        .from(userFeedback)
        .orderBy(desc(userFeedback.createdAt));

      res.json(feedbackList);
    } catch (error) {
      console.error("[Feedback] Error fetching:", error);
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  // Update feedback status (admin only)
  app.patch("/api/admin/feedback/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, adminNotes } = req.body;

      const updateData: Record<string, string> = {};
      if (status) updateData.status = status;
      if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

      const [updated] = await db
        .update(userFeedback)
        .set(updateData)
        .where(eq(userFeedback.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Feedback not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("[Feedback] Error updating:", error);
      res.status(500).json({ error: "Failed to update feedback" });
    }
  });

  // =====================================================
  // NFT Marketplace Routes
  // =====================================================

  // Get marketplace config
  app.get("/api/marketplace/config", async (_req, res) => {
    try {
      const feePercentage = await storage.getMarketplaceConfig("marketplace_fee_percentage") || "2.5";
      const minListingPrice = await storage.getMarketplaceConfig("min_listing_price_sol") || "0.01";
      const maxListingDuration = await storage.getMarketplaceConfig("max_listing_duration_days") || "30";
      const offerExpiration = await storage.getMarketplaceConfig("offer_expiration_days") || "7";
      
      res.json({
        feePercentage: parseFloat(feePercentage),
        minListingPrice: parseFloat(minListingPrice),
        maxListingDurationDays: parseInt(maxListingDuration),
        offerExpirationDays: parseInt(offerExpiration),
        treasuryWallet: process.env.MARKETPLACE_TREASURY_WALLET || null,
      });
    } catch (error) {
      console.error("[Marketplace] Error fetching config:", error);
      res.status(500).json({ error: "Failed to fetch marketplace config" });
    }
  });

  // Get all active listings
  app.get("/api/marketplace/listings", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const listings = await storage.getActiveListings(limit, offset);
      res.json(listings);
    } catch (error) {
      console.error("[Marketplace] Error fetching listings:", error);
      res.status(500).json({ error: "Failed to fetch listings" });
    }
  });

  // Get single listing
  app.get("/api/marketplace/listings/:id", async (req, res) => {
    try {
      const listing = await storage.getNftListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }
      const nft = await storage.getNft(listing.nftId);
      const collection = nft?.collectionId ? await storage.getNftCollection(nft.collectionId) : null;
      res.json({ ...listing, nft, collection });
    } catch (error) {
      console.error("[Marketplace] Error fetching listing:", error);
      res.status(500).json({ error: "Failed to fetch listing" });
    }
  });

  // Get listings by collection
  app.get("/api/marketplace/collections/:collectionId/listings", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const listings = await storage.getListingsByCollection(req.params.collectionId, limit);
      res.json(listings);
    } catch (error) {
      console.error("[Marketplace] Error fetching collection listings:", error);
      res.status(500).json({ error: "Failed to fetch collection listings" });
    }
  });

  // Zod schema for listing creation with server-enforced minimum
  // Validates that price is a valid positive number (not NaN, not negative)
  const createListingSchema = z.object({
    nftId: z.string().uuid("Invalid NFT ID"),
    priceSol: z.union([z.string(), z.number()])
      .transform(val => parseFloat(String(val)))
      .refine(val => !isNaN(val) && isFinite(val), { message: "Price must be a valid number" })
      .refine(val => val > 0, { message: "Price must be greater than 0" }),
    expiresAt: z.string().datetime().optional(),
  });

  // Create a new listing (requires auth) - enforces 0.01 SOL minimum
  app.post("/api/marketplace/listings", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const parsed = createListingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      }
      const { nftId, priceSol, expiresAt } = parsed.data;
      
      // Server-enforced minimum price from config
      const minPrice = parseFloat(await storage.getMarketplaceConfig("min_listing_price_sol") || "0.01");
      if (priceSol < minPrice) {
        return res.status(400).json({ error: `Minimum listing price is ${minPrice} SOL` });
      }

      const nft = await storage.getNft(nftId);
      if (!nft) {
        return res.status(404).json({ error: "NFT not found" });
      }
      if (nft.ownerId !== req.user!.id) {
        return res.status(403).json({ error: "You don't own this NFT" });
      }

      const existingListing = await storage.getActiveNftListingByNft(nftId);
      if (existingListing) {
        return res.status(400).json({ error: "NFT is already listed" });
      }

      const marketplaceFee = await storage.getMarketplaceConfig("marketplace_fee_percentage") || "2.5";
      const listing = await storage.createNftListing({
        nftId,
        sellerId: req.user!.id,
        sellerAddress: req.user!.walletAddress || "",
        priceSol: priceSol.toString(),
        marketplaceFee,
        royaltyFee: nft.royaltyPercentage,
        status: "active",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        listedAt: new Date(),
      });

      console.log(`[Marketplace] New listing created: ${nft.name} for ${priceSol} SOL (min enforced: ${minPrice} SOL)`);
      res.status(201).json(listing);
    } catch (error) {
      console.error("[Marketplace] Error creating listing:", error);
      res.status(500).json({ error: "Failed to create listing" });
    }
  });

  // Zod schema for price update
  // Validates that price is a valid positive number (not NaN, not negative)
  const updatePriceSchema = z.object({
    priceSol: z.union([z.string(), z.number()])
      .transform(val => parseFloat(String(val)))
      .refine(val => !isNaN(val) && isFinite(val), { message: "Price must be a valid number" })
      .refine(val => val > 0, { message: "Price must be greater than 0" }),
  });

  // Update listing price - enforces 0.01 SOL minimum
  app.patch("/api/marketplace/listings/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const parsed = updatePriceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid price format" });
      }
      const { priceSol } = parsed.data;

      const listing = await storage.getNftListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }
      if (listing.sellerId !== req.user!.id) {
        return res.status(403).json({ error: "Not your listing" });
      }
      if (listing.status !== "active") {
        return res.status(400).json({ error: "Listing is not active" });
      }

      // Server-enforced minimum price from config
      const minPrice = parseFloat(await storage.getMarketplaceConfig("min_listing_price_sol") || "0.01");
      if (priceSol < minPrice) {
        return res.status(400).json({ error: `Minimum listing price is ${minPrice} SOL` });
      }

      const updated = await storage.updateNftListing(req.params.id, { priceSol: priceSol.toString() });
      res.json(updated);
    } catch (error) {
      console.error("[Marketplace] Error updating listing:", error);
      res.status(500).json({ error: "Failed to update listing" });
    }
  });

  // Cancel listing
  app.post("/api/marketplace/listings/:id/cancel", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const listing = await storage.getNftListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }
      if (listing.sellerId !== req.user!.id) {
        return res.status(403).json({ error: "Not your listing" });
      }
      if (listing.status !== "active") {
        return res.status(400).json({ error: "Listing is not active" });
      }

      await storage.cancelNftListing(req.params.id);
      console.log(`[Marketplace] Listing cancelled: ${req.params.id}`);
      res.json({ success: true });
    } catch (error) {
      console.error("[Marketplace] Error cancelling listing:", error);
      res.status(500).json({ error: "Failed to cancel listing" });
    }
  });

  // Buy now - instant purchase at listing price with fee calculation
  // Uses atomic status update to prevent race conditions (double-sell)
  app.post("/api/marketplace/listings/:id/buy", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const listing = await storage.getNftListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }
      if (listing.status !== "active") {
        return res.status(400).json({ error: "Listing is not active or already sold" });
      }
      if (listing.sellerId === req.user!.id) {
        return res.status(400).json({ error: "Cannot buy your own listing" });
      }

      const nft = await storage.getNft(listing.nftId);
      if (!nft) {
        return res.status(404).json({ error: "NFT not found" });
      }

      // Calculate fees using server-side config (enforced)
      const salePrice = parseFloat(listing.priceSol);
      const marketplaceFeePercent = parseFloat(await storage.getMarketplaceConfig("marketplace_fee_percentage") || "2.5");
      const royaltyPercent = nft.royaltyPercentage ? parseFloat(nft.royaltyPercentage) : 0;
      
      const marketplaceFeeAmount = salePrice * (marketplaceFeePercent / 100);
      const royaltyAmount = salePrice * (royaltyPercent / 100);
      const sellerProceeds = salePrice - marketplaceFeeAmount - royaltyAmount;

      // Atomic update - prevents race conditions (double-sell)
      // Only marks as sold if still active; returns false if already sold
      const wasSold = await storage.markListingSold(listing.id);
      if (!wasSold) {
        return res.status(409).json({ error: "Listing was already purchased by another buyer" });
      }

      // Record the transaction with fee breakdown
      const transaction = await storage.createNftTransaction({
        nftId: listing.nftId,
        listingId: listing.id,
        fromUserId: listing.sellerId,
        fromAddress: listing.sellerAddress,
        toUserId: req.user!.id,
        toAddress: req.user!.walletAddress || "",
        transactionType: "sale",
        priceSol: salePrice.toString(),
        marketplaceFee: marketplaceFeeAmount.toFixed(6),
        royaltyFee: royaltyAmount.toFixed(6),
        sellerProceeds: sellerProceeds.toFixed(6),
        transactionSignature: `pending_${Date.now()}`, // Will be updated with actual Solana signature
        status: "pending",
      });

      // Update NFT ownership
      await storage.updateNft(listing.nftId, { ownerId: req.user!.id });

      console.log(`[Marketplace] Instant buy: ${nft.name} for ${salePrice} SOL (fee: ${marketplaceFeeAmount.toFixed(4)} SOL, royalty: ${royaltyAmount.toFixed(4)} SOL, seller gets: ${sellerProceeds.toFixed(4)} SOL)`);
      res.json({ 
        success: true, 
        transaction,
        breakdown: {
          salePrice,
          marketplaceFee: marketplaceFeeAmount,
          marketplaceFeePercent,
          royaltyFee: royaltyAmount,
          royaltyPercent,
          sellerProceeds
        }
      });
    } catch (error) {
      console.error("[Marketplace] Error processing purchase:", error);
      res.status(500).json({ error: "Failed to process purchase" });
    }
  });

  // Get offers for a listing
  app.get("/api/marketplace/listings/:id/offers", async (req, res) => {
    try {
      const listing = await storage.getNftListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }
      const offers = await storage.getPendingOffersByListing(req.params.id);
      res.json(offers);
    } catch (error) {
      console.error("[Marketplace] Error fetching offers:", error);
      res.status(500).json({ error: "Failed to fetch offers" });
    }
  });

  // Create an offer on a listing
  app.post("/api/marketplace/listings/:id/offers", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const listing = await storage.getNftListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }
      if (listing.status !== "active") {
        return res.status(400).json({ error: "Listing is not active" });
      }
      if (listing.sellerId === req.user!.id) {
        return res.status(400).json({ error: "Cannot make offer on your own listing" });
      }

      const { offerAmountSol } = req.body;
      if (parseFloat(offerAmountSol) <= 0) {
        return res.status(400).json({ error: "Offer amount must be greater than 0" });
      }

      const offerExpirationDays = parseInt(await storage.getMarketplaceConfig("offer_expiration_days") || "7");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + offerExpirationDays);

      const offer = await storage.createNftOffer({
        nftId: listing.nftId,
        listingId: req.params.id,
        buyerId: req.user!.id,
        buyerAddress: req.user!.walletAddress || "",
        offerAmountSol: offerAmountSol.toString(),
        status: "pending",
        expiresAt,
      });

      console.log(`[Marketplace] New offer: ${offerAmountSol} SOL on listing ${req.params.id}`);
      res.status(201).json(offer);
    } catch (error) {
      console.error("[Marketplace] Error creating offer:", error);
      res.status(500).json({ error: "Failed to create offer" });
    }
  });

  // Accept an offer - calculates and records marketplace fee + transaction
  app.post("/api/marketplace/offers/:id/accept", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const offer = await storage.getNftOffer(req.params.id);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }
      if (offer.status !== "pending") {
        return res.status(400).json({ error: "Offer is not pending" });
      }

      const listing = offer.listingId ? await storage.getNftListing(offer.listingId) : null;
      if (listing && listing.sellerId !== req.user!.id) {
        return res.status(403).json({ error: "Not your listing" });
      }

      const nft = await storage.getNft(offer.nftId);
      if (!nft) {
        return res.status(404).json({ error: "NFT not found" });
      }

      // Calculate fees
      const salePrice = parseFloat(offer.offerAmountSol);
      const marketplaceFeePercent = parseFloat(await storage.getMarketplaceConfig("marketplace_fee_percentage") || "2.5");
      const royaltyPercent = nft.royaltyPercentage ? parseFloat(nft.royaltyPercentage) : 0;
      
      const marketplaceFeeAmount = salePrice * (marketplaceFeePercent / 100);
      const royaltyAmount = salePrice * (royaltyPercent / 100);
      const sellerProceeds = salePrice - marketplaceFeeAmount - royaltyAmount;

      // Accept the offer
      await storage.acceptNftOffer(req.params.id);
      if (listing) {
        await storage.markListingSold(listing.id);
      }

      // Record the transaction with fee breakdown
      const transaction = await storage.createNftTransaction({
        nftId: offer.nftId,
        listingId: offer.listingId || undefined,
        fromUserId: listing?.sellerId || req.user!.id,
        fromAddress: listing?.sellerAddress || req.user!.walletAddress || "",
        toUserId: offer.buyerId,
        toAddress: offer.buyerAddress,
        transactionType: "sale",
        priceSol: salePrice.toString(),
        marketplaceFee: marketplaceFeeAmount.toFixed(6),
        royaltyFee: royaltyAmount.toFixed(6),
        sellerProceeds: sellerProceeds.toFixed(6),
        transactionSignature: `pending_${Date.now()}`, // Will be updated with actual signature
        status: "pending",
      });

      // Update NFT ownership
      await storage.updateNft(offer.nftId, { ownerId: offer.buyerId });

      console.log(`[Marketplace] Sale completed: ${nft.name} for ${salePrice} SOL (fee: ${marketplaceFeeAmount.toFixed(4)} SOL, royalty: ${royaltyAmount.toFixed(4)} SOL, seller gets: ${sellerProceeds.toFixed(4)} SOL)`);
      res.json({ 
        success: true, 
        transaction,
        breakdown: {
          salePrice,
          marketplaceFee: marketplaceFeeAmount,
          royaltyFee: royaltyAmount,
          sellerProceeds
        }
      });
    } catch (error) {
      console.error("[Marketplace] Error accepting offer:", error);
      res.status(500).json({ error: "Failed to accept offer" });
    }
  });

  // Reject an offer
  app.post("/api/marketplace/offers/:id/reject", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const offer = await storage.getNftOffer(req.params.id);
      if (!offer) {
        return res.status(404).json({ error: "Offer not found" });
      }
      if (offer.status !== "pending") {
        return res.status(400).json({ error: "Offer is not pending" });
      }

      const listing = offer.listingId ? await storage.getNftListing(offer.listingId) : null;
      if (listing && listing.sellerId !== req.user!.id) {
        return res.status(403).json({ error: "Not your listing" });
      }

      await storage.rejectNftOffer(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("[Marketplace] Error rejecting offer:", error);
      res.status(500).json({ error: "Failed to reject offer" });
    }
  });

  // Get user's offers
  app.get("/api/marketplace/my-offers", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const offers = await storage.getOffersByBuyer(req.user!.id);
      res.json(offers);
    } catch (error) {
      console.error("[Marketplace] Error fetching user offers:", error);
      res.status(500).json({ error: "Failed to fetch offers" });
    }
  });

  // Get user's listings
  app.get("/api/marketplace/my-listings", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const listings = await storage.getListingsBySeller(req.user!.id);
      res.json(listings);
    } catch (error) {
      console.error("[Marketplace] Error fetching user listings:", error);
      res.status(500).json({ error: "Failed to fetch listings" });
    }
  });

  // =====================================================
  // NFT Collection Routes
  // =====================================================

  // Get all collections
  app.get("/api/collections", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const verified = req.query.verified === "true";
      const collections = verified 
        ? await storage.getVerifiedNftCollections()
        : await storage.getAllNftCollections(limit);
      res.json(collections);
    } catch (error) {
      console.error("[Collections] Error fetching:", error);
      res.status(500).json({ error: "Failed to fetch collections" });
    }
  });

  // Search collections
  app.get("/api/collections/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.status(400).json({ error: "Search query too short" });
      }
      const collections = await storage.searchNftCollections(query, 20);
      res.json(collections);
    } catch (error) {
      console.error("[Collections] Error searching:", error);
      res.status(500).json({ error: "Failed to search collections" });
    }
  });

  // Get single collection
  app.get("/api/collections/:id", async (req, res) => {
    try {
      const collection = await storage.getNftCollection(req.params.id);
      if (!collection) {
        return res.status(404).json({ error: "Collection not found" });
      }
      res.json(collection);
    } catch (error) {
      console.error("[Collections] Error fetching:", error);
      res.status(500).json({ error: "Failed to fetch collection" });
    }
  });

  // Get NFTs in a collection
  app.get("/api/collections/:id/nfts", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const nfts = await storage.getNftsByCollection(req.params.id, limit, offset);
      res.json(nfts);
    } catch (error) {
      console.error("[Collections] Error fetching NFTs:", error);
      res.status(500).json({ error: "Failed to fetch collection NFTs" });
    }
  });

  // =====================================================
  // NFT Routes
  // =====================================================

  // Search NFTs
  app.get("/api/nfts/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.status(400).json({ error: "Search query too short" });
      }
      const nfts = await storage.searchNfts(query, 20);
      res.json(nfts);
    } catch (error) {
      console.error("[NFTs] Error searching:", error);
      res.status(500).json({ error: "Failed to search NFTs" });
    }
  });

  // Get single NFT with listing info
  app.get("/api/nfts/:id", async (req, res) => {
    try {
      const nft = await storage.getNft(req.params.id);
      if (!nft) {
        return res.status(404).json({ error: "NFT not found" });
      }
      const listing = await storage.getActiveNftListingByNft(req.params.id);
      const collection = nft.collectionId ? await storage.getNftCollection(nft.collectionId) : null;
      const transactions = await storage.getNftTransactions(req.params.id, 10);
      res.json({ nft, listing, collection, transactions });
    } catch (error) {
      console.error("[NFTs] Error fetching:", error);
      res.status(500).json({ error: "Failed to fetch NFT" });
    }
  });

  // Get NFT by mint address
  app.get("/api/nfts/mint/:mintAddress", async (req, res) => {
    try {
      const nft = await storage.getNftByMint(req.params.mintAddress);
      if (!nft) {
        return res.status(404).json({ error: "NFT not found" });
      }
      const listing = await storage.getActiveNftListingByNft(nft.id);
      const collection = nft.collectionId ? await storage.getNftCollection(nft.collectionId) : null;
      res.json({ nft, listing, collection });
    } catch (error) {
      console.error("[NFTs] Error fetching by mint:", error);
      res.status(500).json({ error: "Failed to fetch NFT" });
    }
  });

  // Get user's NFTs
  app.get("/api/user/:userId/nfts", async (req, res) => {
    try {
      const nfts = await storage.getNftsByOwner(req.params.userId);
      res.json(nfts);
    } catch (error) {
      console.error("[NFTs] Error fetching user NFTs:", error);
      res.status(500).json({ error: "Failed to fetch user NFTs" });
    }
  });

  // Get user's favorites
  app.get("/api/marketplace/favorites", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const nfts = await storage.getUserFavoriteNfts(req.user!.id);
      const collections = await storage.getUserFavoriteCollections(req.user!.id);
      res.json({ nfts, collections });
    } catch (error) {
      console.error("[Favorites] Error fetching:", error);
      res.status(500).json({ error: "Failed to fetch favorites" });
    }
  });

  // Add to favorites
  app.post("/api/marketplace/favorites", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { nftId, collectionId } = req.body;
      if (!nftId && !collectionId) {
        return res.status(400).json({ error: "Must provide nftId or collectionId" });
      }
      const favorite = await storage.addNftFavorite({
        userId: req.user!.id,
        nftId: nftId || null,
        collectionId: collectionId || null,
      });
      res.status(201).json(favorite);
    } catch (error) {
      console.error("[Favorites] Error adding:", error);
      res.status(500).json({ error: "Failed to add favorite" });
    }
  });

  // Remove from favorites
  app.delete("/api/marketplace/favorites", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { nftId, collectionId } = req.body;
      await storage.removeNftFavorite(req.user!.id, nftId, collectionId);
      res.json({ success: true });
    } catch (error) {
      console.error("[Favorites] Error removing:", error);
      res.status(500).json({ error: "Failed to remove favorite" });
    }
  });

  // Check if NFT is favorited
  app.get("/api/marketplace/favorites/:nftId/check", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const isFavorited = await storage.isNftFavorited(req.user!.id, req.params.nftId);
      res.json({ isFavorited });
    } catch (error) {
      console.error("[Favorites] Error checking:", error);
      res.status(500).json({ error: "Failed to check favorite" });
    }
  });

  // Get recent sales
  app.get("/api/marketplace/recent-sales", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const sales = await storage.getRecentSales(limit);
      res.json(sales);
    } catch (error) {
      console.error("[Marketplace] Error fetching recent sales:", error);
      res.status(500).json({ error: "Failed to fetch recent sales" });
    }
  });

  // Get user's transaction history
  app.get("/api/marketplace/my-transactions", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const transactions = await storage.getUserTransactions(req.user!.id, limit);
      res.json(transactions);
    } catch (error) {
      console.error("[Marketplace] Error fetching user transactions:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // =====================================================
  // FRIENDS API ROUTES
  // =====================================================

  // Send friend request
  app.post("/api/friends/request", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { addresseeId } = req.body;
      const requesterId = req.user!.id;

      if (!addresseeId) {
        return res.status(400).json({ error: "addresseeId is required" });
      }

      // Can't friend yourself
      if (addresseeId === requesterId) {
        return res.status(400).json({ error: "You cannot send a friend request to yourself" });
      }

      // Check if addressee exists
      const addressee = await storage.getUser(addresseeId);
      if (!addressee) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if either user has blocked the other
      const isBlocked = await storage.isBlockedEitherWay(requesterId, addresseeId);
      if (isBlocked) {
        return res.status(403).json({ error: "Cannot send friend request to this user" });
      }

      // Check for existing friendship in either direction
      const existingFriendship = await storage.getFriendshipBetweenUsers(requesterId, addresseeId);
      if (existingFriendship) {
        if (existingFriendship.status === "accepted") {
          return res.status(400).json({ error: "You are already friends with this user" });
        }
        if (existingFriendship.status === "pending") {
          return res.status(400).json({ error: "A friend request already exists between you and this user" });
        }
        if (existingFriendship.status === "blocked") {
          return res.status(400).json({ error: "Cannot send friend request" });
        }
      }

      const friendship = await storage.sendFriendRequest(requesterId, addresseeId);
      res.status(201).json(friendship);
    } catch (error) {
      console.error("[Friends] Error sending friend request:", error);
      res.status(500).json({ error: "Failed to send friend request" });
    }
  });

  // Get pending friend requests (received)
  app.get("/api/friends/requests/pending", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const requests = await storage.getPendingFriendRequests(req.user!.id);
      res.json(requests);
    } catch (error) {
      console.error("[Friends] Error fetching pending requests:", error);
      res.status(500).json({ error: "Failed to fetch pending requests" });
    }
  });

  // Get sent friend requests
  app.get("/api/friends/requests/sent", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const requests = await storage.getSentFriendRequests(req.user!.id);
      res.json(requests);
    } catch (error) {
      console.error("[Friends] Error fetching sent requests:", error);
      res.status(500).json({ error: "Failed to fetch sent requests" });
    }
  });

  // Get all friends
  app.get("/api/friends", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const friends = await storage.getFriends(req.user!.id);
      res.json(friends);
    } catch (error) {
      console.error("[Friends] Error fetching friends:", error);
      res.status(500).json({ error: "Failed to fetch friends" });
    }
  });

  // Accept friend request
  app.post("/api/friends/accept/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const friendship = await storage.getFriendRequest(id);
      if (!friendship) {
        return res.status(404).json({ error: "Friend request not found" });
      }

      // Only the addressee can accept
      if (friendship.addresseeId !== userId) {
        return res.status(403).json({ error: "You can only accept your own incoming friend requests" });
      }

      if (friendship.status !== "pending") {
        return res.status(400).json({ error: "This friend request has already been responded to" });
      }

      const updated = await storage.acceptFriendRequest(id);
      res.json(updated);
    } catch (error) {
      console.error("[Friends] Error accepting friend request:", error);
      res.status(500).json({ error: "Failed to accept friend request" });
    }
  });

  // Decline friend request
  app.post("/api/friends/decline/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const friendship = await storage.getFriendRequest(id);
      if (!friendship) {
        return res.status(404).json({ error: "Friend request not found" });
      }

      // Only the addressee can decline
      if (friendship.addresseeId !== userId) {
        return res.status(403).json({ error: "You can only decline your own incoming friend requests" });
      }

      if (friendship.status !== "pending") {
        return res.status(400).json({ error: "This friend request has already been responded to" });
      }

      const updated = await storage.declineFriendRequest(id);
      res.json(updated);
    } catch (error) {
      console.error("[Friends] Error declining friend request:", error);
      res.status(500).json({ error: "Failed to decline friend request" });
    }
  });

  // Cancel sent friend request
  app.delete("/api/friends/request/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const friendship = await storage.getFriendRequest(id);
      if (!friendship) {
        return res.status(404).json({ error: "Friend request not found" });
      }

      // Only the requester can cancel
      if (friendship.requesterId !== userId) {
        return res.status(403).json({ error: "You can only cancel your own sent friend requests" });
      }

      if (friendship.status !== "pending") {
        return res.status(400).json({ error: "This friend request cannot be cancelled" });
      }

      await storage.cancelFriendRequest(id);
      res.json({ success: true });
    } catch (error) {
      console.error("[Friends] Error cancelling friend request:", error);
      res.status(500).json({ error: "Failed to cancel friend request" });
    }
  });

  // Unfriend (remove friendship)
  app.delete("/api/friends/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const friendship = await storage.getFriendRequest(id);
      if (!friendship) {
        return res.status(404).json({ error: "Friendship not found" });
      }

      // Either party can unfriend
      if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
        return res.status(403).json({ error: "You are not part of this friendship" });
      }

      if (friendship.status !== "accepted") {
        return res.status(400).json({ error: "This is not an active friendship" });
      }

      await storage.unfriend(id);
      res.json({ success: true });
    } catch (error) {
      console.error("[Friends] Error unfriending:", error);
      res.status(500).json({ error: "Failed to unfriend" });
    }
  });

  // Check friendship status with a user
  app.get("/api/friends/status/:userId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { userId: targetUserId } = req.params;
      const currentUserId = req.user!.id;

      if (targetUserId === currentUserId) {
        return res.json({ status: "self" });
      }

      const friendship = await storage.getFriendshipBetweenUsers(currentUserId, targetUserId);
      
      if (!friendship) {
        return res.json({ status: "none", friendship: null });
      }

      // Determine if current user is requester or addressee
      const isRequester = friendship.requesterId === currentUserId;

      res.json({
        status: friendship.status,
        friendship: {
          id: friendship.id,
          isRequester,
          createdAt: friendship.createdAt,
          respondedAt: friendship.respondedAt,
        },
      });
    } catch (error) {
      console.error("[Friends] Error checking friendship status:", error);
      res.status(500).json({ error: "Failed to check friendship status" });
    }
  });

  // =====================================================
  // Private Messaging API Routes (E2E Encrypted DMs)
  // =====================================================

  // Helper function to validate base64 encoded public key
  function isValidBase64(str: string): boolean {
    try {
      return Buffer.from(str, 'base64').toString('base64') === str;
    } catch {
      return false;
    }
  }

  // Get own public key
  app.get("/api/messages/keys/me", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const key = await storage.getUserEncryptionKey(req.user!.id);
      res.json(key || null);
    } catch (error) {
      console.error("[Messages] Error fetching own encryption key:", error);
      res.status(500).json({ error: "Failed to fetch encryption key" });
    }
  });

  // Set own public key
  app.post("/api/messages/keys", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { publicKey } = req.body;
      
      if (!publicKey || typeof publicKey !== 'string') {
        return res.status(400).json({ error: "Public key is required" });
      }

      if (!isValidBase64(publicKey)) {
        return res.status(400).json({ error: "Public key must be base64 encoded" });
      }

      const key = await storage.setUserEncryptionKey(req.user!.id, publicKey);
      res.status(201).json(key);
    } catch (error) {
      console.error("[Messages] Error setting encryption key:", error);
      res.status(500).json({ error: "Failed to set encryption key" });
    }
  });

  // Get another user's public key
  app.get("/api/messages/keys/:userId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;
      
      // Verify user exists
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify friendship (must be friends to get key)
      const areFriends = await storage.areFriends(req.user!.id, userId);
      if (!areFriends) {
        return res.status(403).json({ error: "You must be friends with this user to get their encryption key" });
      }

      const key = await storage.getUserEncryptionKey(userId);
      res.json(key || null);
    } catch (error) {
      console.error("[Messages] Error fetching user encryption key:", error);
      res.status(500).json({ error: "Failed to fetch encryption key" });
    }
  });

  // Get total unread message count
  app.get("/api/messages/unread-count", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const count = await storage.getUnreadMessageCount(req.user!.id);
      res.json({ count });
    } catch (error) {
      console.error("[Messages] Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  // List user's conversations with last message preview and unread count
  app.get("/api/messages/conversations", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const conversations = await storage.getUserConversations(userId);
      
      // Enrich each conversation with other participant info and unread count
      const enrichedConversations = await Promise.all(
        conversations.map(async (conv) => {
          const otherParticipantId = conv.participant1Id === userId 
            ? conv.participant2Id 
            : conv.participant1Id;
          
          const otherUser = await storage.getUser(otherParticipantId);
          
          // Get last message preview
          const messages = await storage.getPrivateMessages(conv.id, 1);
          const lastMessage = messages[0] || null;
          
          // Count unread messages in this conversation
          const allMessages = await storage.getPrivateMessages(conv.id, 1000);
          const unreadCount = allMessages.filter(
            (m) => m.senderId !== userId && !m.isRead
          ).length;
          
          return {
            id: conv.id,
            participant: otherUser ? {
              id: otherUser.id,
              username: otherUser.username,
              avatarUrl: otherUser.avatarUrl,
            } : null,
            lastMessageAt: conv.lastMessageAt,
            lastMessage: lastMessage ? {
              id: lastMessage.id,
              senderId: lastMessage.senderId,
              createdAt: lastMessage.createdAt,
              isRead: lastMessage.isRead,
            } : null,
            unreadCount,
            createdAt: conv.createdAt,
          };
        })
      );
      
      res.json(enrichedConversations);
    } catch (error) {
      console.error("[Messages] Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Create/get conversation with another user
  app.post("/api/messages/conversations", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { userId: targetUserId } = req.body;
      const currentUserId = req.user!.id;
      
      if (!targetUserId) {
        return res.status(400).json({ error: "Target user ID is required" });
      }

      // Prevent messaging self
      if (targetUserId === currentUserId) {
        return res.status(400).json({ error: "You cannot message yourself" });
      }

      // Verify target user exists
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if either user has blocked the other
      const isBlocked = await storage.isBlockedEitherWay(currentUserId, targetUserId);
      if (isBlocked) {
        return res.status(403).json({ error: "Cannot start conversation with this user" });
      }

      // Verify users are friends
      const areFriends = await storage.areFriends(currentUserId, targetUserId);
      if (!areFriends) {
        return res.status(403).json({ error: "You must be friends with this user to start a conversation" });
      }

      // Check for existing or create new
      const conversation = await storage.createConversation(currentUserId, targetUserId);
      
      res.status(201).json({
        id: conversation.id,
        participant: {
          id: targetUser.id,
          username: targetUser.username,
          avatarUrl: targetUser.avatarUrl,
        },
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt,
      });
    } catch (error) {
      console.error("[Messages] Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Get conversation details
  app.get("/api/messages/conversations/:id", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Verify user is participant
      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        return res.status(403).json({ error: "You are not a participant in this conversation" });
      }

      const otherParticipantId = conversation.participant1Id === userId 
        ? conversation.participant2Id 
        : conversation.participant1Id;
      
      const otherUser = await storage.getUser(otherParticipantId);

      res.json({
        id: conversation.id,
        participant: otherUser ? {
          id: otherUser.id,
          username: otherUser.username,
          avatarUrl: otherUser.avatarUrl,
        } : null,
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt,
        isActive: conversation.isActive,
      });
    } catch (error) {
      console.error("[Messages] Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Get messages in conversation (with pagination)
  app.get("/api/messages/conversations/:id/messages", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const before = req.query.before ? new Date(req.query.before as string) : undefined;
      
      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Verify user is participant
      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        return res.status(403).json({ error: "You are not a participant in this conversation" });
      }

      const messages = await storage.getPrivateMessages(id, limit, before);
      
      // Enrich with sender info
      const enrichedMessages = await Promise.all(
        messages.map(async (msg) => {
          const sender = await storage.getUser(msg.senderId);
          return {
            ...msg,
            sender: sender ? {
              id: sender.id,
              username: sender.username,
              avatarUrl: sender.avatarUrl,
            } : null,
          };
        })
      );

      res.json(enrichedMessages);
    } catch (error) {
      console.error("[Messages] Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Send message
  app.post("/api/messages/conversations/:id/messages", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const { encryptedContent, nonce } = req.body;
      
      if (!encryptedContent || typeof encryptedContent !== 'string') {
        return res.status(400).json({ error: "Encrypted content is required" });
      }

      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Verify user is participant
      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        return res.status(403).json({ error: "You are not a participant in this conversation" });
      }

      // Verify users are still friends
      const otherParticipantId = conversation.participant1Id === userId 
        ? conversation.participant2Id 
        : conversation.participant1Id;
      
      // Check if either user has blocked the other
      const isBlocked = await storage.isBlockedEitherWay(userId, otherParticipantId);
      if (isBlocked) {
        return res.status(403).json({ error: "Cannot send messages to this user" });
      }

      const areFriends = await storage.areFriends(userId, otherParticipantId);
      if (!areFriends) {
        return res.status(403).json({ error: "You can only message friends" });
      }

      const message = await storage.createPrivateMessage({
        conversationId: id,
        senderId: userId,
        encryptedContent,
        nonce: nonce || null,
      });

      const sender = await storage.getUser(userId);
      
      res.status(201).json({
        ...message,
        sender: sender ? {
          id: sender.id,
          username: sender.username,
          avatarUrl: sender.avatarUrl,
        } : null,
      });
    } catch (error) {
      console.error("[Messages] Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Mark messages as read
  app.post("/api/messages/conversations/:id/read", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      const conversation = await storage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Verify user is participant
      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        return res.status(403).json({ error: "You are not a participant in this conversation" });
      }

      await storage.markMessagesAsRead(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("[Messages] Error marking messages as read:", error);
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
  });

  // Delete a message (soft delete)
  app.delete("/api/messages/:messageId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { messageId } = req.params;
      const userId = req.user!.id;
      
      // Get all user's conversations to find the message
      const conversations = await storage.getUserConversations(userId);
      let foundMessage = null;
      
      for (const conv of conversations) {
        const messages = await storage.getPrivateMessages(conv.id, 1000);
        const message = messages.find(m => m.id === messageId);
        if (message) {
          foundMessage = message;
          break;
        }
      }
      
      if (!foundMessage) {
        return res.status(404).json({ error: "Message not found" });
      }

      // Only the sender can delete their own message
      if (foundMessage.senderId !== userId) {
        return res.status(403).json({ error: "You can only delete your own messages" });
      }

      await storage.deletePrivateMessage(messageId);
      res.json({ success: true });
    } catch (error) {
      console.error("[Messages] Error deleting message:", error);
      res.status(500).json({ error: "Failed to delete message" });
    }
  });

  // =====================================================
  // MODERATION API ROUTES (User-facing)
  // =====================================================

  const VALID_REPORT_TYPES = ["harassment", "spam", "inappropriate_content", "impersonation", "other"];

  // Admin middleware - checks for admin or founder role
  const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (req.user.role !== "admin" && req.user.role !== "founder") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  };

  // Create a report (with duplicate prevention)
  app.post("/api/moderation/report", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const reporterId = req.user!.id;
      const { reportedUserId, reportType, description, relatedMessageId, relatedConversationId } = req.body;

      if (!reportedUserId) {
        return res.status(400).json({ error: "reportedUserId is required" });
      }

      if (!reportType || !VALID_REPORT_TYPES.includes(reportType)) {
        return res.status(400).json({ 
          error: `reportType must be one of: ${VALID_REPORT_TYPES.join(", ")}` 
        });
      }

      if (reportedUserId === reporterId) {
        return res.status(400).json({ error: "You cannot report yourself" });
      }

      const reportedUser = await storage.getUser(reportedUserId);
      if (!reportedUser) {
        return res.status(404).json({ error: "Reported user not found" });
      }

      // Check for existing pending report to prevent spam
      const existingReport = await storage.getPendingReportByReporterAndTarget(reporterId, reportedUserId);
      if (existingReport) {
        return res.status(400).json({ 
          error: "You already have a pending report against this user. Please wait for it to be reviewed." 
        });
      }

      const report = await storage.createReport({
        reporterId,
        reportedUserId,
        reportType,
        description: description ? String(description).slice(0, 1000) : null,
        relatedMessageId: relatedMessageId || null,
        relatedConversationId: relatedConversationId || null,
        status: "pending",
      });

      res.status(201).json(report);
    } catch (error) {
      console.error("[Moderation] Error creating report:", error);
      res.status(500).json({ error: "Failed to create report" });
    }
  });

  // Block a user
  app.post("/api/moderation/block", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const blockerId = req.user!.id;
      const { blockedId, reason } = req.body;

      if (!blockedId) {
        return res.status(400).json({ error: "blockedId is required" });
      }

      if (blockedId === blockerId) {
        return res.status(400).json({ error: "You cannot block yourself" });
      }

      const blockedUser = await storage.getUser(blockedId);
      if (!blockedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const alreadyBlocked = await storage.isBlocked(blockerId, blockedId);
      if (alreadyBlocked) {
        return res.status(400).json({ error: "User is already blocked" });
      }

      const block = await storage.blockUser(blockerId, blockedId, reason);
      res.status(201).json(block);
    } catch (error) {
      console.error("[Moderation] Error blocking user:", error);
      res.status(500).json({ error: "Failed to block user" });
    }
  });

  // Unblock a user
  app.delete("/api/moderation/block/:blockedId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const blockerId = req.user!.id;
      const { blockedId } = req.params;

      const isBlocked = await storage.isBlocked(blockerId, blockedId);
      if (!isBlocked) {
        return res.status(404).json({ error: "Block not found" });
      }

      await storage.unblockUser(blockerId, blockedId);
      res.json({ success: true });
    } catch (error) {
      console.error("[Moderation] Error unblocking user:", error);
      res.status(500).json({ error: "Failed to unblock user" });
    }
  });

  // List blocked users
  app.get("/api/moderation/blocked", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const blocks = await storage.getBlockedUsers(req.user!.id);
      
      const enrichedBlocks = await Promise.all(
        blocks.map(async (block) => {
          const blockedUser = await storage.getUser(block.blockedId);
          return {
            ...block,
            blockedUser: blockedUser ? {
              id: blockedUser.id,
              username: blockedUser.username,
              avatarUrl: blockedUser.avatarUrl,
            } : null,
          };
        })
      );
      
      res.json(enrichedBlocks);
    } catch (error) {
      console.error("[Moderation] Error fetching blocked users:", error);
      res.status(500).json({ error: "Failed to fetch blocked users" });
    }
  });

  // Check if blocked by another user (useful for UI)
  app.get("/api/moderation/blocked-status/:userId", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const currentUserId = req.user!.id;
      const { userId: targetUserId } = req.params;

      const isBlockedEitherWay = await storage.isBlockedEitherWay(currentUserId, targetUserId);
      const iBlockedThem = await storage.isBlocked(currentUserId, targetUserId);
      const theyBlockedMe = await storage.isBlocked(targetUserId, currentUserId);

      res.json({
        isBlockedEitherWay,
        iBlockedThem,
        theyBlockedMe,
      });
    } catch (error) {
      console.error("[Moderation] Error checking block status:", error);
      res.status(500).json({ error: "Failed to check block status" });
    }
  });

  // =====================================================
  // ADMIN MODERATION ROUTES
  // =====================================================

  // List reports by status
  app.get("/api/admin/reports", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const status = (req.query.status as string) || "pending";
      const limit = parseInt(req.query.limit as string) || 50;
      
      const reports = await storage.getReportsByStatus(status, limit);
      
      const enrichedReports = await Promise.all(
        reports.map(async (report) => {
          const reporter = report.reporterId ? await storage.getUser(report.reporterId) : null;
          const reportedUser = await storage.getUser(report.reportedUserId);
          const resolvedByUser = report.resolvedBy ? await storage.getUser(report.resolvedBy) : null;
          
          return {
            ...report,
            reporter: reporter ? {
              id: reporter.id,
              username: reporter.username,
              avatarUrl: reporter.avatarUrl,
            } : null,
            reportedUser: reportedUser ? {
              id: reportedUser.id,
              username: reportedUser.username,
              avatarUrl: reportedUser.avatarUrl,
            } : null,
            resolvedByUser: resolvedByUser ? {
              id: resolvedByUser.id,
              username: resolvedByUser.username,
            } : null,
          };
        })
      );
      
      res.json(enrichedReports);
    } catch (error) {
      console.error("[Admin] Error fetching reports:", error);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  // Get pending reports count
  app.get("/api/admin/reports/pending/count", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const count = await storage.countPendingReports();
      res.json({ count });
    } catch (error) {
      console.error("[Admin] Error counting pending reports:", error);
      res.status(500).json({ error: "Failed to count pending reports" });
    }
  });

  // Get single report details
  app.get("/api/admin/reports/:id", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const report = await storage.getReport(id);
      
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      
      const reporter = report.reporterId ? await storage.getUser(report.reporterId) : null;
      const reportedUser = await storage.getUser(report.reportedUserId);
      const resolvedByUser = report.resolvedBy ? await storage.getUser(report.resolvedBy) : null;
      
      res.json({
        ...report,
        reporter: reporter ? {
          id: reporter.id,
          username: reporter.username,
          avatarUrl: reporter.avatarUrl,
        } : null,
        reportedUser: reportedUser ? {
          id: reportedUser.id,
          username: reportedUser.username,
          avatarUrl: reportedUser.avatarUrl,
        } : null,
        resolvedByUser: resolvedByUser ? {
          id: resolvedByUser.id,
          username: resolvedByUser.username,
        } : null,
      });
    } catch (error) {
      console.error("[Admin] Error fetching report:", error);
      res.status(500).json({ error: "Failed to fetch report" });
    }
  });

  // Resolve report
  app.post("/api/admin/reports/:id/resolve", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { resolution } = req.body;
      const adminId = req.user!.id;
      
      if (!resolution || typeof resolution !== "string") {
        return res.status(400).json({ error: "Resolution text is required" });
      }
      
      const report = await storage.getReport(id);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      
      if (report.status !== "pending") {
        return res.status(400).json({ error: "Report has already been processed" });
      }
      
      const updated = await storage.resolveReport(id, resolution, adminId);
      res.json(updated);
    } catch (error) {
      console.error("[Admin] Error resolving report:", error);
      res.status(500).json({ error: "Failed to resolve report" });
    }
  });

  // Dismiss report
  app.post("/api/admin/reports/:id/dismiss", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const adminId = req.user!.id;
      
      const report = await storage.getReport(id);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      
      if (report.status !== "pending") {
        return res.status(400).json({ error: "Report has already been processed" });
      }
      
      const updated = await storage.dismissReport(id, adminId);
      res.json(updated);
    } catch (error) {
      console.error("[Admin] Error dismissing report:", error);
      res.status(500).json({ error: "Failed to dismiss report" });
    }
  });

  // Get reports against a specific user
  app.get("/api/admin/reports/user/:userId", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;
      
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const reports = await storage.getReportsAgainstUser(userId);
      
      const enrichedReports = await Promise.all(
        reports.map(async (report) => {
          const reporter = report.reporterId ? await storage.getUser(report.reporterId) : null;
          const resolvedByUser = report.resolvedBy ? await storage.getUser(report.resolvedBy) : null;
          
          return {
            ...report,
            reporter: reporter ? {
              id: reporter.id,
              username: reporter.username,
              avatarUrl: reporter.avatarUrl,
            } : null,
            resolvedByUser: resolvedByUser ? {
              id: resolvedByUser.id,
              username: resolvedByUser.username,
            } : null,
          };
        })
      );
      
      res.json({
        user: {
          id: targetUser.id,
          username: targetUser.username,
          avatarUrl: targetUser.avatarUrl,
        },
        reports: enrichedReports,
      });
    } catch (error) {
      console.error("[Admin] Error fetching user reports:", error);
      res.status(500).json({ error: "Failed to fetch user reports" });
    }
  });

  return httpServer;
}
