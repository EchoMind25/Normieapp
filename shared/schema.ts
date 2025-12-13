import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Token metrics for $NORMIE
export const tokenMetricsSchema = z.object({
  price: z.number(),
  priceChange24h: z.number(),
  marketCap: z.number(),
  marketCapChange24h: z.number(),
  volume24h: z.number(),
  liquidity: z.number(),
  totalSupply: z.number(),
  circulatingSupply: z.number(),
  burnedTokens: z.number(),
  lockedTokens: z.number(),
  holders: z.number(),
  lastUpdated: z.string(),
});

export type TokenMetrics = z.infer<typeof tokenMetricsSchema>;

// Price history for charts
export const pricePointSchema = z.object({
  timestamp: z.number(),
  price: z.number(),
  volume: z.number(),
});

export type PricePoint = z.infer<typeof pricePointSchema>;

// Product for merch shop
export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  priceUSD: z.number(),
  priceSol: z.number(),
  image: z.string(),
  category: z.enum(["apparel", "accessories", "drinkware", "lifestyle"]),
  inStock: z.boolean(),
});

export type Product = z.infer<typeof productSchema>;

export const insertProductSchema = productSchema.omit({ id: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;

// Poll for community engagement
export const pollSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.object({
    id: z.string(),
    text: z.string(),
    votes: z.number(),
  })),
  totalVotes: z.number(),
  endsAt: z.string().optional(),
  isActive: z.boolean(),
});

export type Poll = z.infer<typeof pollSchema>;

export const insertPollSchema = pollSchema.omit({ id: true, totalVotes: true });
export type InsertPoll = z.infer<typeof insertPollSchema>;

// Activity feed item
export const activityItemSchema = z.object({
  id: z.string(),
  type: z.enum(["burn", "lock", "trade", "milestone"]),
  message: z.string(),
  amount: z.number().optional(),
  timestamp: z.string(),
});

export type ActivityItem = z.infer<typeof activityItemSchema>;

// Cart item for shop
export const cartItemSchema = z.object({
  productId: z.string(),
  quantity: z.number(),
});

export type CartItem = z.infer<typeof cartItemSchema>;

// User schema (existing)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Normie token constants
export const NORMIE_TOKEN = {
  address: "FrSFwE2BxWADEyUWFXDMAeomzuB4r83ZvzdG9sevpump",
  name: "NORMIE",
  symbol: "$NORMIE",
  decimals: 6,
  rpcEndpoint: "https://solana-rpc.publicnode.com",
  telegram: "@TheNormieNation",
  twitter: "@NormieCEO",
  description: "A 4chan-inspired memecoin focused on everyday 'normie' culture. Relentless burns, community raids, and merch empire.",
};

// Fallback/seed data for when RPC is unavailable
export const FALLBACK_METRICS: TokenMetrics = {
  price: 0.00019233,
  priceChange24h: 6.88,
  marketCap: 192300,
  marketCapChange24h: 6.88,
  volume24h: 15500,
  liquidity: 21500,
  totalSupply: 1000000000,
  circulatingSupply: 428000000,
  burnedTokens: 572000000,
  lockedTokens: 230000000,
  holders: 1847,
  lastUpdated: new Date().toISOString(),
};
