import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, timestamp, decimal, uuid, primaryKey, index, uniqueIndex } from "drizzle-orm/pg-core";
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

// Dev buy transaction for chart markers
export const devBuySchema = z.object({
  signature: z.string(),
  timestamp: z.number(),
  amount: z.number(),
  price: z.number(),
});

export type DevBuy = z.infer<typeof devBuySchema>;

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

// =====================================================
// PHASE 2: User Authentication & Profile Tables
// =====================================================

// Icons table for customizable profile icons
export const icons = pgTable("icons", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  fileUrl: text("file_url").notNull(),
  uploadedBy: uuid("uploaded_by"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertIconSchema = createInsertSchema(icons).omit({ id: true, createdAt: true });
export type InsertIcon = z.infer<typeof insertIconSchema>;
export type Icon = typeof icons.$inferSelect;

// Users table with wallet and email authentication
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletAddress: varchar("wallet_address", { length: 44 }).unique(),
  email: varchar("email", { length: 255 }).unique(),
  passwordHash: text("password_hash"),
  username: varchar("username", { length: 50 }).unique().notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  selectedIconId: uuid("selected_icon_id").references(() => icons.id),
  role: varchar("role", { length: 20 }).default("user"),
  holdingsVisible: boolean("holdings_visible").default(false),
  passwordChanged: boolean("password_changed").default(true),
  notifyNewPolls: boolean("notify_new_polls").default(true),
  notifyPollResults: boolean("notify_poll_results").default(true),
  notifyAnnouncements: boolean("notify_announcements").default(true),
  notifyWhaleAlerts: boolean("notify_whale_alerts").default(true),
  notifyJeetAlarms: boolean("notify_jeet_alarms").default(true),
  notifyArtworkStatus: boolean("notify_artwork_status").default(true),
  themePreference: varchar("theme_preference", { length: 10 }).default("system"),
  walletFeaturesUnlocked: boolean("wallet_features_unlocked").default(false),
  bannedAt: timestamp("banned_at"),
  bannedUntil: timestamp("banned_until"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_users_wallet").on(table.walletAddress),
  index("idx_users_email").on(table.email),
]);

export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  bannedAt: true,
  bannedUntil: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// User sessions for JWT token management
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: varchar("token", { length: 500 }).unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_sessions_token").on(table.token),
]);

export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true, createdAt: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

// User notifications
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // "new_poll", "poll_ended", etc.
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  relatedId: uuid("related_id"), // ID of related poll, etc.
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_notifications_user").on(table.userId),
  index("idx_notifications_unread").on(table.userId, table.isRead),
]);

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true, isRead: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Push notification subscriptions
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  endpoint: text("endpoint").notNull(),
  p256dhKey: text("p256dh_key").notNull(),
  authKey: text("auth_key").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_push_subs_user").on(table.userId),
]);

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true, createdAt: true });
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// Password reset tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: varchar("token", { length: 255 }).unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({ 
  id: true, 
  createdAt: true,
  used: true,
});
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Manual dev buys table for admin-added chart markers
export const manualDevBuys = pgTable("manual_dev_buys", {
  id: uuid("id").primaryKey().defaultRandom(),
  timestamp: timestamp("timestamp").notNull(),
  amount: decimal("amount", { precision: 20, scale: 6 }).notNull(),
  price: decimal("price", { precision: 20, scale: 10 }).notNull(),
  label: varchar("label", { length: 100 }),
  addedBy: uuid("added_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertManualDevBuySchema = createInsertSchema(manualDevBuys).omit({ 
  id: true, 
  createdAt: true,
});
export type InsertManualDevBuy = z.infer<typeof insertManualDevBuySchema>;
export type ManualDevBuy = typeof manualDevBuys.$inferSelect;

// Stored dev buys - automatically detected dev wallet transactions
export const storedDevBuys = pgTable("stored_dev_buys", {
  id: uuid("id").primaryKey().defaultRandom(),
  signature: varchar("signature", { length: 100 }).unique().notNull(),
  timestamp: timestamp("timestamp").notNull(),
  amount: decimal("amount", { precision: 20, scale: 6 }).notNull(),
  price: decimal("price", { precision: 20, scale: 10 }).notNull(),
  solSpent: decimal("sol_spent", { precision: 20, scale: 9 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_stored_dev_buys_timestamp").on(table.timestamp),
  index("idx_stored_dev_buys_sig").on(table.signature),
]);

export const insertStoredDevBuySchema = createInsertSchema(storedDevBuys).omit({ 
  id: true, 
  createdAt: true,
});
export type InsertStoredDevBuy = z.infer<typeof insertStoredDevBuySchema>;
export type StoredDevBuy = typeof storedDevBuys.$inferSelect;

// Whale buys - transactions where >2% of supply was purchased
export const whaleBuys = pgTable("whale_buys", {
  id: uuid("id").primaryKey().defaultRandom(),
  signature: varchar("signature", { length: 100 }).unique().notNull(),
  walletAddress: varchar("wallet_address", { length: 44 }).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  amount: decimal("amount", { precision: 20, scale: 6 }).notNull(),
  price: decimal("price", { precision: 20, scale: 10 }).notNull(),
  solSpent: decimal("sol_spent", { precision: 20, scale: 9 }),
  percentOfSupply: decimal("percent_of_supply", { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_whale_buys_timestamp").on(table.timestamp),
  index("idx_whale_buys_wallet").on(table.walletAddress),
  index("idx_whale_buys_sig").on(table.signature),
]);

export const insertWhaleBuySchema = createInsertSchema(whaleBuys).omit({ 
  id: true, 
  createdAt: true,
});
export type InsertWhaleBuy = z.infer<typeof insertWhaleBuySchema>;
export type WhaleBuy = typeof whaleBuys.$inferSelect;

// =====================================================
// PHASE 2: NFT Marketplace Tables
// =====================================================

// NFT Collections table
export const nftCollections = pgTable("nft_collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  symbol: varchar("symbol", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  bannerUrl: text("banner_url"),
  creatorAddress: varchar("creator_address", { length: 44 }),
  creatorId: uuid("creator_id").references(() => users.id),
  verified: boolean("verified").default(false),
  floorPrice: decimal("floor_price", { precision: 20, scale: 9 }),
  totalVolume: decimal("total_volume", { precision: 20, scale: 9 }).default("0"),
  totalSales: integer("total_sales").default(0),
  totalListings: integer("total_listings").default(0),
  uniqueHolders: integer("unique_holders").default(0),
  royaltyPercentage: decimal("royalty_percentage", { precision: 5, scale: 2 }).default("5.0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_collections_symbol").on(table.symbol),
  index("idx_collections_verified").on(table.verified),
  index("idx_collections_floor").on(table.floorPrice),
]);

export const insertNftCollectionSchema = createInsertSchema(nftCollections).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  totalVolume: true,
  totalSales: true,
  totalListings: true,
  uniqueHolders: true,
});
export type InsertNftCollection = z.infer<typeof insertNftCollectionSchema>;
export type NftCollection = typeof nftCollections.$inferSelect;

// NFTs table
export const nfts = pgTable("nfts", {
  id: uuid("id").primaryKey().defaultRandom(),
  mintAddress: varchar("mint_address", { length: 44 }).unique().notNull(),
  collectionId: uuid("collection_id").references(() => nftCollections.id),
  ownerId: uuid("owner_id").references(() => users.id),
  ownerAddress: varchar("owner_address", { length: 44 }),
  creatorId: uuid("creator_id").references(() => users.id),
  creatorAddress: varchar("creator_address", { length: 44 }),
  metadataUri: text("metadata_uri"),
  name: varchar("name", { length: 200 }),
  description: text("description"),
  imageUrl: text("image_url"),
  attributes: text("attributes"), // JSON string of traits
  rarityScore: decimal("rarity_score", { precision: 10, scale: 4 }),
  rarityRank: integer("rarity_rank"),
  royaltyPercentage: decimal("royalty_percentage", { precision: 5, scale: 2 }).default("5.0"),
  lastSalePrice: decimal("last_sale_price", { precision: 20, scale: 9 }),
  lastSaleAt: timestamp("last_sale_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_nfts_owner").on(table.ownerId),
  index("idx_nfts_owner_address").on(table.ownerAddress),
  index("idx_nfts_collection").on(table.collectionId),
  index("idx_nfts_mint").on(table.mintAddress),
]);

export const insertNftSchema = createInsertSchema(nfts).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
});
export type InsertNft = z.infer<typeof insertNftSchema>;
export type Nft = typeof nfts.$inferSelect;

// NFT Listings (marketplace listings)
export const nftListings = pgTable("nft_listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  nftId: uuid("nft_id").references(() => nfts.id).notNull(),
  sellerId: uuid("seller_id").references(() => users.id).notNull(),
  sellerAddress: varchar("seller_address", { length: 44 }).notNull(),
  priceSol: decimal("price_sol", { precision: 20, scale: 9 }).notNull(),
  marketplaceFee: decimal("marketplace_fee", { precision: 5, scale: 2 }).default("2.5"),
  royaltyFee: decimal("royalty_fee", { precision: 5, scale: 2 }),
  escrowAccount: varchar("escrow_account", { length: 44 }),
  listingSignature: varchar("listing_signature", { length: 88 }),
  status: varchar("status", { length: 20 }).default("active"), // active, sold, cancelled, expired
  expiresAt: timestamp("expires_at"),
  listedAt: timestamp("listed_at").defaultNow(),
  soldAt: timestamp("sold_at"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_listings_nft").on(table.nftId),
  index("idx_listings_seller").on(table.sellerId),
  index("idx_listings_status").on(table.status),
  index("idx_listings_price").on(table.priceSol),
]);

export const insertNftListingSchema = createInsertSchema(nftListings).omit({ 
  id: true, 
  createdAt: true,
  soldAt: true,
  cancelledAt: true,
});
export type InsertNftListing = z.infer<typeof insertNftListingSchema>;
export type NftListing = typeof nftListings.$inferSelect;

// NFT Offers
export const nftOffers = pgTable("nft_offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  nftId: uuid("nft_id").references(() => nfts.id).notNull(),
  listingId: uuid("listing_id").references(() => nftListings.id),
  buyerId: uuid("buyer_id").references(() => users.id).notNull(),
  buyerAddress: varchar("buyer_address", { length: 44 }).notNull(),
  offerAmountSol: decimal("offer_amount_sol", { precision: 20, scale: 9 }).notNull(),
  escrowAccount: varchar("escrow_account", { length: 44 }),
  offerSignature: varchar("offer_signature", { length: 88 }),
  status: varchar("status", { length: 20 }).default("pending"), // pending, accepted, rejected, expired, cancelled
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
}, (table) => [
  index("idx_offers_nft").on(table.nftId),
  index("idx_offers_buyer").on(table.buyerId),
  index("idx_offers_listing").on(table.listingId),
  index("idx_offers_status").on(table.status),
]);

export const insertNftOfferSchema = createInsertSchema(nftOffers).omit({ 
  id: true, 
  createdAt: true,
  respondedAt: true,
});
export type InsertNftOffer = z.infer<typeof insertNftOfferSchema>;
export type NftOffer = typeof nftOffers.$inferSelect;

// NFT transactions (sales/transfers)
export const nftTransactions = pgTable("nft_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  nftId: uuid("nft_id").references(() => nfts.id),
  listingId: uuid("listing_id").references(() => nftListings.id),
  offerId: uuid("offer_id").references(() => nftOffers.id),
  fromUserId: uuid("from_user_id").references(() => users.id),
  fromAddress: varchar("from_address", { length: 44 }),
  toUserId: uuid("to_user_id").references(() => users.id),
  toAddress: varchar("to_address", { length: 44 }),
  transactionType: varchar("transaction_type", { length: 20 }), // sale, transfer, mint, list, delist
  priceSol: decimal("price_sol", { precision: 20, scale: 9 }),
  marketplaceFeeAmount: decimal("marketplace_fee_amount", { precision: 20, scale: 9 }),
  royaltyFeeAmount: decimal("royalty_fee_amount", { precision: 20, scale: 9 }),
  txSignature: varchar("tx_signature", { length: 88 }),
  blockTime: timestamp("block_time"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_nft_tx_nft").on(table.nftId),
  index("idx_nft_tx_from").on(table.fromUserId),
  index("idx_nft_tx_to").on(table.toUserId),
  index("idx_nft_tx_type").on(table.transactionType),
  index("idx_nft_tx_created").on(table.createdAt),
]);

export const insertNftTransactionSchema = createInsertSchema(nftTransactions).omit({ 
  id: true, 
  createdAt: true,
});
export type InsertNftTransaction = z.infer<typeof insertNftTransactionSchema>;
export type NftTransaction = typeof nftTransactions.$inferSelect;

// User favorites/watchlist
export const nftFavorites = pgTable("nft_favorites", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  nftId: uuid("nft_id").references(() => nfts.id, { onDelete: "cascade" }),
  collectionId: uuid("collection_id").references(() => nftCollections.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_favorites_user").on(table.userId),
  index("idx_favorites_nft").on(table.nftId),
  index("idx_favorites_collection").on(table.collectionId),
]);

export const insertNftFavoriteSchema = createInsertSchema(nftFavorites).omit({ 
  id: true, 
  createdAt: true,
});
export type InsertNftFavorite = z.infer<typeof insertNftFavoriteSchema>;
export type NftFavorite = typeof nftFavorites.$inferSelect;

// Marketplace configuration
export const marketplaceConfig = pgTable("marketplace_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 50 }).unique().notNull(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMarketplaceConfigSchema = createInsertSchema(marketplaceConfig).omit({ 
  id: true, 
  updatedAt: true,
});
export type InsertMarketplaceConfig = z.infer<typeof insertMarketplaceConfigSchema>;
export type MarketplaceConfig = typeof marketplaceConfig.$inferSelect;

// =====================================================
// PHASE 2: Chat Tables
// =====================================================

// Chat rooms
export const chatRooms = pgTable("chat_rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  creatorId: uuid("creator_id").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChatRoomSchema = createInsertSchema(chatRooms).omit({ 
  id: true, 
  createdAt: true,
});
export type InsertChatRoom = z.infer<typeof insertChatRoomSchema>;
// Extended insert type that allows setting explicit id (for seeding)
export const insertChatRoomWithIdSchema = createInsertSchema(chatRooms).omit({ 
  createdAt: true,
});
export type InsertChatRoomWithId = z.infer<typeof insertChatRoomWithIdSchema>;
export type ChatRoom = typeof chatRooms.$inferSelect;

// Chat messages
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id").references(() => chatRooms.id, { onDelete: "cascade" }).notNull(),
  senderId: uuid("sender_id").references(() => users.id),
  senderName: varchar("sender_name", { length: 100 }),
  content: text("content").notNull(),
  fileUrl: text("file_url"),
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_chat_messages_room").on(table.roomId),
]);

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ 
  id: true, 
  createdAt: true,
  isDeleted: true,
});
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// Extended type with sender avatar and role for display
export type ChatMessageWithAvatar = ChatMessage & {
  senderAvatarUrl?: string | null;
  senderRole?: string | null;
};

// Chat room members
export const chatRoomMembers = pgTable("chat_room_members", {
  roomId: uuid("room_id").references(() => chatRooms.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { length: 20 }).default("member"),
  encryptedKey: text("encrypted_key"),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.roomId, table.userId] }),
]);

export const insertChatRoomMemberSchema = createInsertSchema(chatRoomMembers).omit({ 
  joinedAt: true,
});
export type InsertChatRoomMember = z.infer<typeof insertChatRoomMemberSchema>;
export type ChatRoomMember = typeof chatRoomMembers.$inferSelect;

// =====================================================
// Auth Challenge for Wallet Signature Verification
// =====================================================

export const authChallenges = pgTable("auth_challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletAddress: varchar("wallet_address", { length: 44 }).notNull(),
  challenge: varchar("challenge", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAuthChallengeSchema = createInsertSchema(authChallenges).omit({ 
  id: true, 
  createdAt: true,
  used: true,
});
export type InsertAuthChallenge = z.infer<typeof insertAuthChallengeSchema>;
export type AuthChallenge = typeof authChallenges.$inferSelect;

// =====================================================
// Community Polls Tables
// =====================================================

// Polls table
export const polls = pgTable("polls", {
  id: uuid("id").primaryKey().defaultRandom(),
  question: varchar("question", { length: 500 }).notNull(),
  isActive: boolean("is_active").default(true),
  endsAt: timestamp("ends_at"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPollDbSchema = createInsertSchema(polls).omit({ 
  id: true, 
  createdAt: true,
});
export type InsertPollDb = z.infer<typeof insertPollDbSchema>;
export type PollDb = typeof polls.$inferSelect;

// Poll options table
export const pollOptions = pgTable("poll_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  pollId: uuid("poll_id").references(() => polls.id, { onDelete: "cascade" }).notNull(),
  text: varchar("text", { length: 200 }).notNull(),
  votes: integer("votes").default(0),
}, (table) => [
  index("idx_poll_options_poll").on(table.pollId),
]);

export const insertPollOptionSchema = createInsertSchema(pollOptions).omit({ 
  id: true, 
  votes: true,
});
export type InsertPollOption = z.infer<typeof insertPollOptionSchema>;
export type PollOption = typeof pollOptions.$inferSelect;

// Poll votes table (to track who voted)
export const pollVotes = pgTable("poll_votes", {
  id: uuid("id").primaryKey().defaultRandom(),
  pollId: uuid("poll_id").references(() => polls.id, { onDelete: "cascade" }).notNull(),
  optionId: uuid("option_id").references(() => pollOptions.id, { onDelete: "cascade" }).notNull(),
  visitorId: varchar("visitor_id", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_poll_votes_poll").on(table.pollId),
  index("idx_poll_votes_visitor").on(table.visitorId),
]);

export const insertPollVoteSchema = createInsertSchema(pollVotes).omit({ 
  id: true, 
  createdAt: true,
});
export type InsertPollVote = z.infer<typeof insertPollVoteSchema>;
export type PollVote = typeof pollVotes.$inferSelect;

// Activity items table for real activity feed
export const activityItems = pgTable("activity_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 20 }).notNull(),
  message: text("message").notNull(),
  amount: decimal("amount", { precision: 20, scale: 6 }),
  txSignature: varchar("tx_signature", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActivityItemDbSchema = createInsertSchema(activityItems).omit({ 
  id: true, 
  createdAt: true,
});
export type InsertActivityItemDb = z.infer<typeof insertActivityItemDbSchema>;
export type ActivityItemDb = typeof activityItems.$inferSelect;

// =====================================================
// Art Gallery Tables
// =====================================================

export const galleryItems = pgTable("gallery_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  creatorId: uuid("creator_id").references(() => users.id),
  creatorName: varchar("creator_name", { length: 100 }),
  tags: text("tags").array(),
  status: varchar("status", { length: 20 }).default("pending"),
  upvotes: integer("upvotes").default(0),
  downvotes: integer("downvotes").default(0),
  views: integer("views").default(0),
  featured: boolean("featured").default(false),
  mintedAsNft: boolean("minted_as_nft").default(false),
  nftId: uuid("nft_id").references(() => nfts.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_gallery_status").on(table.status),
  index("idx_gallery_featured").on(table.featured),
  index("idx_gallery_creator").on(table.creatorId),
]);

export const insertGalleryItemSchema = createInsertSchema(galleryItems).omit({ 
  id: true, 
  createdAt: true,
  upvotes: true,
  downvotes: true,
  views: true,
});
export type InsertGalleryItem = z.infer<typeof insertGalleryItemSchema>;
export type GalleryItem = typeof galleryItems.$inferSelect;

export const galleryVotes = pgTable("gallery_votes", {
  id: uuid("id").primaryKey().defaultRandom(),
  galleryItemId: uuid("gallery_item_id").references(() => galleryItems.id, { onDelete: "cascade" }).notNull(),
  visitorId: varchar("visitor_id", { length: 100 }).notNull(),
  voteType: varchar("vote_type", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_gallery_votes_item").on(table.galleryItemId),
  index("idx_gallery_votes_visitor").on(table.visitorId),
]);

export const insertGalleryVoteSchema = createInsertSchema(galleryVotes).omit({ 
  id: true, 
  createdAt: true,
});
export type InsertGalleryVote = z.infer<typeof insertGalleryVoteSchema>;
export type GalleryVote = typeof galleryVotes.$inferSelect;

export const galleryComments = pgTable("gallery_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  galleryItemId: uuid("gallery_item_id").references(() => galleryItems.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id),
  visitorName: varchar("visitor_name", { length: 50 }),
  content: text("content").notNull(),
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_gallery_comments_item").on(table.galleryItemId),
]);

export const insertGalleryCommentSchema = createInsertSchema(galleryComments).omit({ 
  id: true, 
  createdAt: true,
  isDeleted: true,
});
export type InsertGalleryComment = z.infer<typeof insertGalleryCommentSchema>;
export type GalleryComment = typeof galleryComments.$inferSelect;

// Extended type with commenter avatar for display
export type GalleryCommentWithAvatar = GalleryComment & {
  userAvatarUrl?: string | null;
};

// =====================================================
// User Feedback Table
// =====================================================

export const userFeedback = pgTable("user_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  visitorName: varchar("visitor_name", { length: 100 }),
  email: varchar("email", { length: 255 }),
  category: varchar("category", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  status: varchar("status", { length: 20 }).default("new"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_feedback_status").on(table.status),
  index("idx_feedback_category").on(table.category),
]);

export const insertUserFeedbackSchema = createInsertSchema(userFeedback).omit({ 
  id: true, 
  createdAt: true,
  status: true,
  adminNotes: true,
});
export type InsertUserFeedback = z.infer<typeof insertUserFeedbackSchema>;
export type UserFeedback = typeof userFeedback.$inferSelect;

// =====================================================
// API Optimization: Price History & Caching Tables
// =====================================================

// Price history table for storing historical price data
export const priceHistory = pgTable("price_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenAddress: varchar("token_address", { length: 44 }).notNull(),
  price: decimal("price", { precision: 20, scale: 10 }).notNull(),
  volume24h: decimal("volume_24h", { precision: 20, scale: 2 }),
  marketCap: decimal("market_cap", { precision: 20, scale: 2 }),
  source: varchar("source", { length: 50 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => [
  index("idx_price_history_token_time").on(table.tokenAddress, table.timestamp),
  index("idx_price_history_timestamp").on(table.timestamp),
]);

export const insertPriceHistorySchema = createInsertSchema(priceHistory).omit({ 
  id: true, 
});
export type InsertPriceHistory = z.infer<typeof insertPriceHistorySchema>;
export type PriceHistory = typeof priceHistory.$inferSelect;

// API cache table for smart caching with change detection
export const apiCache = pgTable("api_cache", {
  id: uuid("id").primaryKey().defaultRandom(),
  cacheKey: varchar("cache_key", { length: 255 }).unique().notNull(),
  data: text("data").notNull(),
  etag: varchar("etag", { length: 100 }),
  lastModified: timestamp("last_modified"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_api_cache_key_expires").on(table.cacheKey, table.expiresAt),
]);

export const insertApiCacheSchema = createInsertSchema(apiCache).omit({ 
  id: true, 
  createdAt: true,
});
export type InsertApiCache = z.infer<typeof insertApiCacheSchema>;
export type ApiCache = typeof apiCache.$inferSelect;

// =====================================================
// Bug Reports Table
// =====================================================

export const bugReports = pgTable("bug_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  description: text("description").notNull(),
  pageUrl: text("page_url").notNull(),
  userAgent: text("user_agent"),
  screenshotData: text("screenshot_data"),
  imageAudit: text("image_audit"),
  brokenImagesCount: integer("broken_images_count").default(0),
  viewport: text("viewport"),
  performanceMetrics: text("performance_metrics"),
  status: varchar("status", { length: 20 }).default("open"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_bug_reports_status").on(table.status),
  index("idx_bug_reports_created").on(table.createdAt),
]);

export const insertBugReportSchema = createInsertSchema(bugReports).omit({ 
  id: true, 
  createdAt: true,
  resolvedAt: true,
});
export type InsertBugReport = z.infer<typeof insertBugReportSchema>;
export type BugReport = typeof bugReports.$inferSelect;

// =====================================================
// Jeet Sells Table - Track all sell transactions for leaderboard
// =====================================================

export const jeetSells = pgTable("jeet_sells", {
  id: uuid("id").primaryKey().defaultRandom(),
  signature: varchar("signature", { length: 100 }).unique().notNull(),
  walletAddress: varchar("wallet_address", { length: 44 }).notNull(),
  soldAmount: decimal("sold_amount", { precision: 20, scale: 6 }).notNull(),
  soldValueSol: decimal("sold_value_sol", { precision: 20, scale: 9 }),
  slot: integer("slot"),
  blockTime: timestamp("block_time"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_jeet_sells_wallet").on(table.walletAddress),
  index("idx_jeet_sells_block_time").on(table.blockTime),
  index("idx_jeet_sells_amount").on(table.soldAmount),
]);

export const insertJeetSellSchema = createInsertSchema(jeetSells).omit({ 
  id: true, 
  createdAt: true,
});
export type InsertJeetSell = z.infer<typeof insertJeetSellSchema>;
export type JeetSell = typeof jeetSells.$inferSelect;

// Aggregated jeet leaderboard entry type
export type JeetLeaderboardEntry = {
  rank: number;
  walletAddress: string;
  totalSold: number;
  sellCount: number;
  solscanUrl: string;
};

// =====================================================
// Jeet Wallet Totals Table - Aggregated per-wallet data for fast leaderboard
// =====================================================

export const jeetWalletTotals = pgTable("jeet_wallet_totals", {
  walletAddress: varchar("wallet_address", { length: 44 }).primaryKey(),
  totalTokensSold: decimal("total_tokens_sold", { precision: 24, scale: 6 }).default("0").notNull(),
  totalSolValue: decimal("total_sol_value", { precision: 20, scale: 9 }).default("0"),
  sellCount: integer("sell_count").default(0).notNull(),
  firstSellAt: timestamp("first_sell_at"),
  lastSellAt: timestamp("last_sell_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type JeetWalletTotal = typeof jeetWalletTotals.$inferSelect;

// =====================================================
// Wallet Holdings Tables - Track holder leaderboards (Diamond Hands & Whales)
// =====================================================

export const walletHoldings = pgTable("wallet_holdings", {
  walletAddress: varchar("wallet_address", { length: 44 }).primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  currentBalance: decimal("current_balance", { precision: 24, scale: 6 }).default("0").notNull(),
  totalBought: decimal("total_bought", { precision: 24, scale: 6 }).default("0").notNull(),
  totalSold: decimal("total_sold", { precision: 24, scale: 6 }).default("0").notNull(),
  firstBuyAt: timestamp("first_buy_at"),
  lastBuyAt: timestamp("last_buy_at"),
  holdStartAt: timestamp("hold_start_at"),
  buyCount: integer("buy_count").default(0).notNull(),
  sellCount: integer("sell_count").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_wallet_holdings_balance").on(table.currentBalance),
  index("idx_wallet_holdings_hold_start").on(table.holdStartAt),
  index("idx_wallet_holdings_user").on(table.userId),
]);

export const insertWalletHoldingSchema = createInsertSchema(walletHoldings);
export type InsertWalletHolding = z.infer<typeof insertWalletHoldingSchema>;
export type WalletHolding = typeof walletHoldings.$inferSelect;

export const walletBuys = pgTable("wallet_buys", {
  id: uuid("id").primaryKey().defaultRandom(),
  signature: varchar("signature", { length: 100 }).unique().notNull(),
  walletAddress: varchar("wallet_address", { length: 44 }).notNull(),
  boughtAmount: decimal("bought_amount", { precision: 20, scale: 6 }).notNull(),
  boughtValueSol: decimal("bought_value_sol", { precision: 20, scale: 9 }),
  priceAtBuy: decimal("price_at_buy", { precision: 20, scale: 12 }),
  slot: integer("slot"),
  blockTime: timestamp("block_time"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_wallet_buys_wallet").on(table.walletAddress),
  index("idx_wallet_buys_block_time").on(table.blockTime),
  index("idx_wallet_buys_amount").on(table.boughtAmount),
]);

export const insertWalletBuySchema = createInsertSchema(walletBuys).omit({ 
  id: true, 
  createdAt: true,
});
export type InsertWalletBuy = z.infer<typeof insertWalletBuySchema>;
export type WalletBuy = typeof walletBuys.$inferSelect;

export type DiamondHandsEntry = {
  rank: number;
  walletAddress: string;
  userId?: string | null;
  username?: string | null;
  currentBalance: number;
  holdDurationSeconds: number;
  firstBuyAt: string | null;
  solscanUrl: string;
};

export type WhaleEntry = {
  rank: number;
  walletAddress: string;
  userId?: string | null;
  username?: string | null;
  currentBalance: number;
  holdDurationSeconds: number;
  firstBuyAt: string | null;
  solscanUrl: string;
};

// =====================================================
// Founder Wallets Table - Multiple wallets for founder
// =====================================================

export const founderWallets = pgTable("founder_wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  walletAddress: varchar("wallet_address", { length: 44 }).notNull().unique(),
  walletName: varchar("wallet_name", { length: 100 }).notNull(),
  walletType: varchar("wallet_type", { length: 50 }).notNull(), // 'giveaway', 'dev', 'personal', 'treasury', 'other'
  showOnLeaderboard: boolean("show_on_leaderboard").default(false),
  isActive: boolean("is_active").default(true),
  balance: decimal("balance", { precision: 20, scale: 6 }),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_founder_wallets_user").on(table.userId),
  index("idx_founder_wallets_address").on(table.walletAddress),
  index("idx_founder_wallets_type").on(table.walletType),
]);

export const insertFounderWalletSchema = createInsertSchema(founderWallets).omit({ 
  id: true, 
  createdAt: true,
  lastUpdated: true,
  balance: true,
});
export type InsertFounderWallet = z.infer<typeof insertFounderWalletSchema>;
export type FounderWallet = typeof founderWallets.$inferSelect;

// =====================================================
// Friendships & Social System (Apple Compliant)
// =====================================================

// Friend requests and friendships
export const friendships = pgTable("friendships", {
  id: uuid("id").primaryKey().defaultRandom(),
  requesterId: uuid("requester_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  addresseeId: uuid("addressee_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, accepted, declined, blocked
  createdAt: timestamp("created_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
}, (table) => [
  index("idx_friendships_requester").on(table.requesterId),
  index("idx_friendships_addressee").on(table.addresseeId),
  index("idx_friendships_status").on(table.status),
  uniqueIndex("idx_friendships_unique_pair").on(table.requesterId, table.addresseeId),
]);

export const insertFriendshipSchema = createInsertSchema(friendships).omit({ 
  id: true, 
  createdAt: true,
  respondedAt: true,
});
export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;
export type Friendship = typeof friendships.$inferSelect;

// Friend with friendship ID for API responses
export interface FriendWithDetails {
  id: string;
  friendshipId: string;
  username: string;
  avatarUrl: string | null;
}

// Pending friend request with requester details
export interface PendingFriendRequest {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: string;
  createdAt: string;
  requester: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
}

// =====================================================
// Encrypted Direct Messages (E2E Encryption Ready)
// =====================================================

// Private conversations (DMs between friends)
export const privateConversations = pgTable("private_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  participant1Id: uuid("participant1_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  participant2Id: uuid("participant2_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  isActive: boolean("is_active").default(true),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_private_convos_p1").on(table.participant1Id),
  index("idx_private_convos_p2").on(table.participant2Id),
  index("idx_private_convos_last_msg").on(table.lastMessageAt),
]);

export const insertPrivateConversationSchema = createInsertSchema(privateConversations).omit({ 
  id: true, 
  createdAt: true,
  lastMessageAt: true,
});
export type InsertPrivateConversation = z.infer<typeof insertPrivateConversationSchema>;
export type PrivateConversation = typeof privateConversations.$inferSelect;

// Private messages with E2E encryption support
export const privateMessages = pgTable("private_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").references(() => privateConversations.id, { onDelete: "cascade" }).notNull(),
  senderId: uuid("sender_id").references(() => users.id).notNull(),
  encryptedContent: text("encrypted_content").notNull(), // E2E encrypted message content
  nonce: text("nonce"), // Encryption nonce for decryption
  isRead: boolean("is_read").default(false),
  isDeleted: boolean("is_deleted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_private_msgs_convo").on(table.conversationId),
  index("idx_private_msgs_sender").on(table.senderId),
  index("idx_private_msgs_created").on(table.createdAt),
]);

export const insertPrivateMessageSchema = createInsertSchema(privateMessages).omit({ 
  id: true, 
  createdAt: true,
  isRead: true,
  isDeleted: true,
});
export type InsertPrivateMessage = z.infer<typeof insertPrivateMessageSchema>;
export type PrivateMessage = typeof privateMessages.$inferSelect;

// User encryption keys (public keys for E2E encryption)
// Note: updatedAt should be set manually when updating keys since Drizzle doesn't support onUpdate triggers
export const userEncryptionKeys = pgTable("user_encryption_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  publicKey: text("public_key").notNull(), // Public key for receiving encrypted messages
  keyVersion: integer("key_version").default(1), // For key rotation
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()),
}, (table) => [
  index("idx_user_encryption_keys_user").on(table.userId),
]);

export const insertUserEncryptionKeySchema = createInsertSchema(userEncryptionKeys).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
});
export type InsertUserEncryptionKey = z.infer<typeof insertUserEncryptionKeySchema>;
export type UserEncryptionKey = typeof userEncryptionKeys.$inferSelect;

// =====================================================
// Report & Block System (Apple Compliance)
// =====================================================

// User reports for moderation
export const userReports = pgTable("user_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: uuid("reporter_id").references(() => users.id, { onDelete: "set null" }),
  reportedUserId: uuid("reported_user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  reportType: varchar("report_type", { length: 50 }).notNull(), // harassment, spam, inappropriate_content, impersonation, other
  description: text("description"),
  relatedMessageId: uuid("related_message_id").references(() => chatMessages.id, { onDelete: "set null" }),
  relatedConversationId: uuid("related_conversation_id").references(() => privateConversations.id, { onDelete: "set null" }),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, reviewed, resolved, dismissed
  resolution: text("resolution"),
  resolvedBy: uuid("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_reports_reporter").on(table.reporterId),
  index("idx_user_reports_reported").on(table.reportedUserId),
  index("idx_user_reports_status").on(table.status),
  index("idx_user_reports_type").on(table.reportType),
]);

export const insertUserReportSchema = createInsertSchema(userReports).omit({ 
  id: true, 
  createdAt: true,
  resolvedAt: true,
  resolution: true,
  resolvedBy: true,
});
export type InsertUserReport = z.infer<typeof insertUserReportSchema>;
export type UserReport = typeof userReports.$inferSelect;

// Blocked users list
export const userBlocks = pgTable("user_blocks", {
  id: uuid("id").primaryKey().defaultRandom(),
  blockerId: uuid("blocker_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  blockedId: uuid("blocked_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_blocks_blocker").on(table.blockerId),
  index("idx_user_blocks_blocked").on(table.blockedId),
]);

export const insertUserBlockSchema = createInsertSchema(userBlocks).omit({ 
  id: true, 
  createdAt: true,
});
export type InsertUserBlock = z.infer<typeof insertUserBlockSchema>;
export type UserBlock = typeof userBlocks.$inferSelect;

// =====================================================
// Normie token constants
// =====================================================

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

// Data sources:
// - DexScreener API for real-time token metrics (price, market cap, volume, liquidity)
// - Solana RPC for dev wallet transaction history
// - pump.fun for token info: https://pump.fun/coin/FrSFwE2BxWADEyUWFXDMAeomzuB4r83ZvzdG9sevpump
