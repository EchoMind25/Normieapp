import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import path from "path";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { storage } from "./storage";
import { hashPassword, ADMIN_USERNAME, ADMIN_EMAIL, ADMIN2_USERNAME, ADMIN2_EMAIL, ADMIN3_USERNAME, ADMIN3_EMAIL } from "./auth";
import { verifyDatabaseConnection, checkTablesExist, getEnvironmentName } from "./db";

const app = express();
const httpServer = createServer(app);

app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});


// Seed default chat room on startup (idempotent)
async function seedDefaultChatRoom() {
  const DEFAULT_ROOM_ID = "00000000-0000-0000-0000-000000000001";
  try {
    const existingRoom = await storage.getChatRoom(DEFAULT_ROOM_ID);
    if (existingRoom) {
      log(`Default chat room already exists (id: ${DEFAULT_ROOM_ID})`, "seed");
      return;
    }
    
    await storage.createChatRoomWithId({
      id: DEFAULT_ROOM_ID,
      name: "General",
      type: "public",
      isActive: true
    });
    log(`Created default chat room "General" (id: ${DEFAULT_ROOM_ID})`, "seed");
  } catch (error: any) {
    log(`Failed to seed default chat room: ${error.message}`, "seed");
  }
}


// Seed admin account on startup
async function seedAdminAccount() {
  try {
    log(`Checking for admin account "${ADMIN_USERNAME}"...`, "seed");
    
    const existingAdmin = await storage.getUserByUsername(ADMIN_USERNAME);
    if (existingAdmin) {
      log(`Admin account "${ADMIN_USERNAME}" already exists (id: ${existingAdmin.id}) - SKIPPING (password NOT modified)`, "seed");
    } else if (!process.env.NORMIE_ADMIN_PASSWORD) {
      log(`Admin account "${ADMIN_USERNAME}" not created - NORMIE_ADMIN_PASSWORD environment variable required`, "seed");
    } else {
      const passwordHash = await hashPassword(process.env.NORMIE_ADMIN_PASSWORD);

      const newAdmin = await storage.createUser({
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        passwordHash,
        role: "admin",
        walletAddress: process.env.ADMIN_WALLET_ADDRESS || null,
        passwordChanged: false,
      });

      log(`Admin account "${ADMIN_USERNAME}" created successfully (id: ${newAdmin.id})`, "seed");
      log(`Admin email: ${ADMIN_EMAIL}`, "seed");
      log(`Password changed flag: false (will require password reset on first login)`, "seed");
    }

    // Seed second admin account (Echo_Dev)
    log(`Checking for admin account "${ADMIN2_USERNAME}"...`, "seed");
    
    const existingAdmin2 = await storage.getUserByUsername(ADMIN2_USERNAME);
    if (existingAdmin2) {
      log(`Admin account "${ADMIN2_USERNAME}" already exists (id: ${existingAdmin2.id}) - SKIPPING (password NOT modified)`, "seed");
    } else if (!process.env.ECHO_DEV_ADMIN_PASSWORD) {
      log(`Admin account "${ADMIN2_USERNAME}" not created - ECHO_DEV_ADMIN_PASSWORD environment variable required`, "seed");
    } else {
      const passwordHash2 = await hashPassword(process.env.ECHO_DEV_ADMIN_PASSWORD);

      const newAdmin2 = await storage.createUser({
        username: ADMIN2_USERNAME,
        email: ADMIN2_EMAIL,
        passwordHash: passwordHash2,
        role: "admin",
        walletAddress: null,
        passwordChanged: false,
      });

      log(`Admin account "${ADMIN2_USERNAME}" created successfully (id: ${newAdmin2.id})`, "seed");
      log(`Admin email: ${ADMIN2_EMAIL}`, "seed");
      log(`Password changed flag: false (will require password reset on first login)`, "seed");
    }

    // Seed third admin account (cryptoWilliams)
    log(`Checking for admin account "${ADMIN3_USERNAME}"...`, "seed");
    
    const existingAdmin3 = await storage.getUserByUsername(ADMIN3_USERNAME);
    if (existingAdmin3) {
      log(`Admin account "${ADMIN3_USERNAME}" already exists (id: ${existingAdmin3.id}) - SKIPPING (password NOT modified)`, "seed");
    } else if (!process.env.CRYPTO_WILLIAMS_PASSWORD) {
      log(`Admin account "${ADMIN3_USERNAME}" not created - CRYPTO_WILLIAMS_PASSWORD environment variable required`, "seed");
    } else {
      const passwordHash3 = await hashPassword(process.env.CRYPTO_WILLIAMS_PASSWORD);

      const newAdmin3 = await storage.createUser({
        username: ADMIN3_USERNAME,
        email: ADMIN3_EMAIL,
        passwordHash: passwordHash3,
        role: "admin",
        walletAddress: null,
        passwordChanged: false,
      });

      log(`Admin account "${ADMIN3_USERNAME}" created successfully (id: ${newAdmin3.id})`, "seed");
      log(`Admin email: ${ADMIN3_EMAIL}`, "seed");
      log(`Password changed flag: false (will require password reset on first login)`, "seed");
    }
  } catch (error: any) {
    log(`CRITICAL: Failed to seed admin account: ${error.message}`, "seed");
    log(`Stack trace: ${error.stack}`, "seed");
  }
}

// Seed marketplace config with default values (idempotent)
async function seedMarketplaceConfig() {
  try {
    const defaultConfigs = [
      { key: "marketplace_fee_percentage", value: "2.5" },
      { key: "min_listing_price_sol", value: "0.01" },
      { key: "max_listing_duration_days", value: "30" },
      { key: "offer_expiration_days", value: "7" },
      { key: "treasury_wallet", value: process.env.MARKETPLACE_TREASURY_WALLET || "" },
    ];

    for (const config of defaultConfigs) {
      const existing = await storage.getMarketplaceConfig(config.key);
      if (!existing) {
        await storage.setMarketplaceConfig(config.key, config.value);
        log(`Set marketplace config: ${config.key} = ${config.value}`, "seed");
      }
    }
    log(`Marketplace config initialized (2.5% fee, 0.01 SOL min)`, "seed");
  } catch (error: any) {
    log(`Failed to seed marketplace config: ${error.message}`, "seed");
  }
}

// Track database connection status globally for health checks
let databaseConnected = false;
export function isDatabaseConnected() { return databaseConnected; }

(async () => {
  // Log environment and verify database connection
  log(`Starting server in ${getEnvironmentName()} mode`, "startup");
  
  // Database connection is REQUIRED - fail fast if not available
  const dbConnected = await verifyDatabaseConnection();
  databaseConnected = dbConnected;
  
  if (!dbConnected) {
    log("CRITICAL: Database connection failed. Cannot start server without database.", "startup");
    log("Please check DATABASE_URL environment variable and database availability.", "startup");
    process.exit(1);
  } else {
    // Only run migrations and seeds if database is connected
    // Check if all required tables exist
    const tableCheck = await checkTablesExist();
    if (!tableCheck.exists) {
      log(`WARNING: Some database tables may be missing. Run migrations with: npm run db:push`, "startup");
    }

    // Seed data on startup
    log("Seeding database...", "startup");
    await seedAdminAccount();
    await seedDefaultChatRoom();
    await seedMarketplaceConfig();
    // Demo polls seeding removed - admins create polls manually
  }
  
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
