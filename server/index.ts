import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { storage } from "./storage";
import { hashPassword, ADMIN_USERNAME, ADMIN_EMAIL, ADMIN2_USERNAME, ADMIN2_EMAIL } from "./auth";
import { verifyDatabaseConnection, checkTablesExist, getEnvironmentName } from "./db";

const app = express();
const httpServer = createServer(app);

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

// Sample polls for seeding - minimum 5 as required
const SAMPLE_POLLS = [
  {
    question: "What should be the next community focus for $NORMIE?",
    options: ["More token burns", "New partnerships", "Community contests", "Developer transparency reports"]
  },
  {
    question: "Which exchange should list $NORMIE next?",
    options: ["Binance", "Coinbase", "Kraken", "KuCoin", "Gate.io"]
  },
  {
    question: "Best meme of the week?",
    options: ["Diamond Hands Pepe", "Moon Wojak", "Gigachad Holder", "Doge to Mars"]
  },
  {
    question: "What feature should we prioritize next?",
    options: ["NFT marketplace", "Staking rewards", "Mobile app", "DAO governance"]
  },
  {
    question: "Rate the latest community event",
    options: ["Amazing - 5 stars", "Great - 4 stars", "Good - 3 stars", "Needs improvement"]
  },
  {
    question: "Favorite Solana memecoin besides $NORMIE?",
    options: ["BONK", "WIF", "POPCAT", "MEW", "Other"]
  }
];

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

// Seed demo polls on startup (idempotent - checks existing polls)
async function seedDemoPolls() {
  try {
    const existingPolls = await storage.getActivePolls();
    
    if (existingPolls.length >= 5) {
      log(`Sufficient polls already exist (${existingPolls.length} active polls)`, "seed");
      return;
    }

    // Get questions of existing polls to avoid duplicates
    const existingQuestions = new Set(existingPolls.map(p => p.question));
    let created = 0;

    for (const poll of SAMPLE_POLLS) {
      if (existingQuestions.has(poll.question)) {
        continue;
      }

      try {
        await storage.createPoll(
          { question: poll.question, isActive: true },
          poll.options
        );
        created++;
        log(`Created poll: "${poll.question.substring(0, 40)}..."`, "seed");
      } catch (pollError: any) {
        log(`Failed to create poll "${poll.question}": ${pollError.message}`, "seed");
      }
    }

    if (created > 0) {
      log(`Seeded ${created} new polls successfully`, "seed");
    } else {
      log("No new polls needed to be created", "seed");
    }
  } catch (error: any) {
    log(`Failed to seed demo polls: ${error.message}`, "seed");
    log(`Stack trace: ${error.stack}`, "seed");
  }
}

// Seed admin account on startup
async function seedAdminAccount() {
  try {
    log(`Checking for admin account "${ADMIN_USERNAME}"...`, "seed");
    
    const existingAdmin = await storage.getUserByUsername(ADMIN_USERNAME);
    if (existingAdmin) {
      log(`Admin account "${ADMIN_USERNAME}" already exists (id: ${existingAdmin.id}) - SKIPPING (password NOT modified)`, "seed");
    } else {
      // Create admin account with password from environment or default
      const adminPassword = process.env.NORMIE_ADMIN_PASSWORD || "NormieAdmin2024!";
      const passwordHash = await hashPassword(adminPassword);

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
      
      if (!process.env.NORMIE_ADMIN_PASSWORD) {
        log("WARNING: Using default admin password. Set NORMIE_ADMIN_PASSWORD in production!", "seed");
      }
    }

    // Seed second admin account (Echo_Dev)
    log(`Checking for admin account "${ADMIN2_USERNAME}"...`, "seed");
    
    const existingAdmin2 = await storage.getUserByUsername(ADMIN2_USERNAME);
    if (existingAdmin2) {
      log(`Admin account "${ADMIN2_USERNAME}" already exists (id: ${existingAdmin2.id}) - SKIPPING (password NOT modified)`, "seed");
    } else {
      const admin2Password = process.env.ECHO_DEV_ADMIN_PASSWORD || "EchoDev2024!";
      const passwordHash2 = await hashPassword(admin2Password);

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
      
      if (!process.env.ECHO_DEV_ADMIN_PASSWORD) {
        log("WARNING: Using default Echo_Dev admin password. Set ECHO_DEV_ADMIN_PASSWORD in production!", "seed");
      }
    }
  } catch (error: any) {
    log(`CRITICAL: Failed to seed admin account: ${error.message}`, "seed");
    log(`Stack trace: ${error.stack}`, "seed");
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
    await seedDemoPolls();
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
