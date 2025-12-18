import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { sql } from "drizzle-orm";

const { Pool } = pg;

function getEnvironmentName(): string {
  if (process.env.NODE_ENV === "production") return "PRODUCTION";
  if (process.env.REPLIT_DEPLOYMENT) return "PRODUCTION";
  return "DEVELOPMENT";
}

function log(message: string, source = "database") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  allowExitOnIdle: false,
});

pool.on("error", (err) => {
  log(`Pool error: ${err.message}`, "database");
});

pool.on("connect", () => {
  log(`New client connected to ${getEnvironmentName()} database`, "database");
});

export const db = drizzle(pool);

export async function verifyDatabaseConnection(): Promise<boolean> {
  const maxRetries = 3;
  const retryDelay = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log(`Attempting database connection (attempt ${attempt}/${maxRetries})...`, "database");
      
      const result = await db.execute(sql`SELECT 1 as connected, current_database() as db_name`);
      const dbName = (result.rows[0] as any)?.db_name || "unknown";
      
      log(`Connected to ${getEnvironmentName()} database: ${dbName}`, "database");
      return true;
    } catch (error: any) {
      log(`Connection attempt ${attempt} failed: ${error.message}`, "database");
      
      if (attempt < maxRetries) {
        log(`Retrying in ${retryDelay / 1000} seconds...`, "database");
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  log("CRITICAL: Failed to connect to database after all retries", "database");
  return false;
}

export async function checkTablesExist(): Promise<{ exists: boolean; missing: string[] }> {
  try {
    const requiredTables = [
      "users", "sessions", "password_reset_tokens", "auth_challenges",
      "icons", "nfts", "nft_transactions", "chat_rooms", "chat_messages",
      "chat_room_members", "polls", "poll_options", "poll_votes",
      "activity_items", "gallery_items", "gallery_votes", "gallery_comments",
      "manual_dev_buys"
    ];

    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    const existingTables = new Set((result.rows as any[]).map(r => r.table_name));
    const missing = requiredTables.filter(t => !existingTables.has(t));

    if (missing.length > 0) {
      log(`Missing tables: ${missing.join(", ")}`, "database");
      return { exists: false, missing };
    }

    log(`All ${requiredTables.length} required tables exist`, "database");
    return { exists: true, missing: [] };
  } catch (error: any) {
    log(`Failed to check tables: ${error.message}`, "database");
    return { exists: false, missing: ["unknown - query failed"] };
  }
}

export { getEnvironmentName };
