import { db } from "./db";
import { eq, and, gt, desc, sql, or, asc, ilike, gte, lte, notInArray } from "drizzle-orm";
import {
  users,
  sessions,
  passwordResetTokens,
  authChallenges,
  icons,
  storedDevBuys,
  whaleBuys,
  jeetSells,
  jeetWalletTotals,
  walletHoldings,
  walletBuys,
  nfts,
  nftCollections,
  nftListings,
  nftOffers,
  nftTransactions,
  nftFavorites,
  marketplaceConfig,
  chatRooms,
  chatMessages,
  chatRoomMembers,
  polls,
  pollOptions,
  pollVotes,
  activityItems,
  galleryItems,
  galleryVotes,
  galleryComments,
  notifications,
  pushSubscriptions,
  privateConversations,
  privateMessages,
  userEncryptionKeys,
  type User,
  type InsertUser,
  type Session,
  type InsertSession,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type AuthChallenge,
  type InsertAuthChallenge,
  type Icon,
  type InsertIcon,
  type StoredDevBuy,
  type InsertStoredDevBuy,
  type WhaleBuy,
  type InsertWhaleBuy,
  type Nft,
  type InsertNft,
  type NftCollection,
  type InsertNftCollection,
  type NftListing,
  type InsertNftListing,
  type NftOffer,
  type InsertNftOffer,
  type NftTransaction,
  type InsertNftTransaction,
  type NftFavorite,
  type InsertNftFavorite,
  type MarketplaceConfig,
  type InsertMarketplaceConfig,
  type ChatRoom,
  type InsertChatRoom,
  type InsertChatRoomWithId,
  type ChatMessage,
  type ChatMessageWithAvatar,
  type InsertChatMessage,
  type ChatRoomMember,
  type InsertChatRoomMember,
  type PollDb,
  type InsertPollDb,
  type PollOption,
  type InsertPollOption,
  type PollVote,
  type InsertPollVote,
  type ActivityItemDb,
  type InsertActivityItemDb,
  type GalleryItem,
  type InsertGalleryItem,
  type GalleryVote,
  type InsertGalleryVote,
  type GalleryComment,
  type GalleryCommentWithAvatar,
  type InsertGalleryComment,
  type Notification,
  type InsertNotification,
  type PushSubscription,
  type InsertPushSubscription,
  type JeetSell,
  type InsertJeetSell,
  type JeetLeaderboardEntry,
  type WalletHolding,
  type InsertWalletHolding,
  type WalletBuy,
  type InsertWalletBuy,
  type DiamondHandsEntry,
  type WhaleEntry,
  founderWallets,
  type FounderWallet,
  type InsertFounderWallet,
  friendships,
  type Friendship,
  type InsertFriendship,
  type FriendWithDetails,
  type PendingFriendRequest,
  type PrivateConversation,
  type InsertPrivateConversation,
  type PrivateMessage,
  type InsertPrivateMessage,
  type UserEncryptionKey,
  type InsertUserEncryptionKey,
  userReports,
  type UserReport,
  type InsertUserReport,
  userBlocks,
  type UserBlock,
  type InsertUserBlock,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByWallet(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  banUser(id: string, bannedUntil?: Date | null): Promise<void>;
  unbanUser(id: string): Promise<void>;
  countUsers(): Promise<number>;
  
  // Sessions
  createSession(session: InsertSession): Promise<Session>;
  getSessionByToken(token: string): Promise<Session | undefined>;
  deleteSession(id: string): Promise<void>;
  deleteUserSessions(userId: string): Promise<void>;
  
  // Password Reset
  createPasswordResetToken(data: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(id: string): Promise<void>;
  
  // Auth Challenges (for wallet signature verification)
  createAuthChallenge(data: InsertAuthChallenge): Promise<AuthChallenge>;
  getAuthChallenge(walletAddress: string, challenge: string): Promise<AuthChallenge | undefined>;
  markAuthChallengeUsed(id: string): Promise<void>;
  
  // Icons
  getActiveIcons(): Promise<Icon[]>;
  getAllIcons(): Promise<Icon[]>;
  getIcon(id: string): Promise<Icon | undefined>;
  createIcon(icon: InsertIcon): Promise<Icon>;
  updateIcon(id: string, data: Partial<InsertIcon>): Promise<Icon | undefined>;
  deleteIcon(id: string): Promise<void>;
  
  // Stored Dev Buys (auto-tracked from blockchain)
  createStoredDevBuy(buy: InsertStoredDevBuy): Promise<StoredDevBuy>;
  getStoredDevBuyBySignature(signature: string): Promise<StoredDevBuy | undefined>;
  getStoredDevBuys(limit?: number): Promise<StoredDevBuy[]>;
  getStoredDevBuysInRange(startDate: Date, endDate: Date): Promise<StoredDevBuy[]>;
  getAllStoredDevBuys(): Promise<StoredDevBuy[]>;
  
  // Whale Buys (>2% of supply purchases)
  createWhaleBuy(buy: InsertWhaleBuy): Promise<WhaleBuy>;
  getWhaleBuyBySignature(signature: string): Promise<WhaleBuy | undefined>;
  getWhaleBuys(limit?: number): Promise<WhaleBuy[]>;
  getWhaleBuysInRange(startDate: Date, endDate: Date): Promise<WhaleBuy[]>;
  getAllWhaleBuys(): Promise<WhaleBuy[]>;
  
  // Admin User Management
  getAllUsersWithStats(): Promise<Array<User & { messageCount: number; galleryCount: number }>>;
  getUserChatMessages(userId: string, limit?: number): Promise<ChatMessage[]>;
  getUserGalleryItems(userId: string): Promise<GalleryItem[]>;
  deleteAllSessions(): Promise<number>;
  
  // NFT Collections
  createNftCollection(collection: InsertNftCollection): Promise<NftCollection>;
  getNftCollection(id: string): Promise<NftCollection | undefined>;
  getNftCollectionBySymbol(symbol: string): Promise<NftCollection | undefined>;
  getAllNftCollections(limit?: number): Promise<NftCollection[]>;
  getVerifiedNftCollections(): Promise<NftCollection[]>;
  updateNftCollection(id: string, data: Partial<InsertNftCollection>): Promise<NftCollection | undefined>;
  searchNftCollections(query: string, limit?: number): Promise<NftCollection[]>;
  
  // NFTs
  createNft(nft: InsertNft): Promise<Nft>;
  getNft(id: string): Promise<Nft | undefined>;
  getNftByMint(mintAddress: string): Promise<Nft | undefined>;
  getNftsByOwner(ownerId: string): Promise<Nft[]>;
  getNftsByOwnerAddress(ownerAddress: string): Promise<Nft[]>;
  getNftsByCollection(collectionId: string, limit?: number, offset?: number): Promise<Nft[]>;
  updateNft(id: string, data: Partial<InsertNft>): Promise<Nft | undefined>;
  searchNfts(query: string, limit?: number): Promise<Nft[]>;
  
  // NFT Listings
  createNftListing(listing: InsertNftListing): Promise<NftListing>;
  getNftListing(id: string): Promise<NftListing | undefined>;
  getActiveNftListingByNft(nftId: string): Promise<NftListing | undefined>;
  getActiveListings(limit?: number, offset?: number): Promise<Array<NftListing & { nft: Nft }>>;
  getListingsBySeller(sellerId: string): Promise<NftListing[]>;
  getListingsByCollection(collectionId: string, limit?: number): Promise<Array<NftListing & { nft: Nft }>>;
  updateNftListing(id: string, data: Partial<InsertNftListing>): Promise<NftListing | undefined>;
  cancelNftListing(id: string): Promise<void>;
  markListingSold(id: string): Promise<boolean>;
  
  // NFT Offers
  createNftOffer(offer: InsertNftOffer): Promise<NftOffer>;
  getNftOffer(id: string): Promise<NftOffer | undefined>;
  getOffersByNft(nftId: string): Promise<NftOffer[]>;
  getOffersByBuyer(buyerId: string): Promise<NftOffer[]>;
  getPendingOffersByListing(listingId: string): Promise<NftOffer[]>;
  updateNftOffer(id: string, data: Partial<InsertNftOffer>): Promise<NftOffer | undefined>;
  acceptNftOffer(id: string): Promise<void>;
  rejectNftOffer(id: string): Promise<void>;
  
  // NFT Transactions
  createNftTransaction(tx: InsertNftTransaction): Promise<NftTransaction>;
  getNftTransactions(nftId: string, limit?: number): Promise<NftTransaction[]>;
  getRecentSales(limit?: number): Promise<NftTransaction[]>;
  getUserTransactions(userId: string, limit?: number): Promise<NftTransaction[]>;
  
  // NFT Favorites
  addNftFavorite(favorite: InsertNftFavorite): Promise<NftFavorite>;
  removeNftFavorite(userId: string, nftId?: string, collectionId?: string): Promise<void>;
  getUserFavoriteNfts(userId: string): Promise<Nft[]>;
  getUserFavoriteCollections(userId: string): Promise<NftCollection[]>;
  isNftFavorited(userId: string, nftId: string): Promise<boolean>;
  
  // Marketplace Config
  getMarketplaceConfig(key: string): Promise<string | undefined>;
  setMarketplaceConfig(key: string, value: string): Promise<void>;
  
  // Chat Rooms
  createChatRoom(room: InsertChatRoom): Promise<ChatRoom>;
  createChatRoomWithId(room: InsertChatRoomWithId): Promise<ChatRoom>;
  getChatRoom(id: string): Promise<ChatRoom | undefined>;
  getPublicChatRooms(): Promise<ChatRoom[]>;
  
  // Chat Messages
  createChatMessage(msg: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(roomId: string, limit?: number): Promise<ChatMessageWithAvatar[]>;
  markMessageDeleted(id: string): Promise<void>;
  
  // Chat Room Members
  addChatRoomMember(member: InsertChatRoomMember): Promise<ChatRoomMember>;
  removeChatRoomMember(roomId: string, userId: string): Promise<void>;
  getChatRoomMembers(roomId: string): Promise<ChatRoomMember[]>;
  isRoomMember(roomId: string, userId: string): Promise<boolean>;
  
  // Polls
  getActivePolls(): Promise<Array<PollDb & { options: PollOption[] }>>;
  getAllPolls(): Promise<Array<PollDb & { options: PollOption[] }>>;
  getPoll(id: string): Promise<(PollDb & { options: PollOption[] }) | undefined>;
  createPoll(poll: InsertPollDb, options: string[]): Promise<PollDb>;
  deletePoll(id: string): Promise<void>;
  hasVoted(pollId: string, visitorId: string): Promise<boolean>;
  vote(pollId: string, optionId: string, visitorId: string): Promise<void>;
  
  // Activity Feed
  getRecentActivity(limit?: number): Promise<ActivityItemDb[]>;
  createActivityItem(item: InsertActivityItemDb): Promise<ActivityItemDb>;
  
  // Leaderboard
  getTopMemeCreators(limit?: number): Promise<{ userId: string; username: string; avatarUrl?: string; score: number; rank: number }[]>;
  getTopChatters(limit?: number): Promise<{ userId: string; username: string; avatarUrl?: string; score: number; rank: number }[]>;
  
  // Gallery
  getApprovedGalleryItems(limit?: number): Promise<GalleryItem[]>;
  getPendingGalleryItems(): Promise<GalleryItem[]>;
  getFeaturedGalleryItems(): Promise<GalleryItem[]>;
  getGalleryItem(id: string): Promise<GalleryItem | undefined>;
  createGalleryItem(item: InsertGalleryItem): Promise<GalleryItem>;
  updateGalleryItem(id: string, data: Partial<InsertGalleryItem>): Promise<GalleryItem | undefined>;
  approveGalleryItem(id: string): Promise<void>;
  rejectGalleryItem(id: string, reason?: string): Promise<GalleryItem | undefined>;
  deleteGalleryItem(id: string): Promise<void>;
  featureGalleryItem(id: string, featured: boolean): Promise<void>;
  hasGalleryVoted(itemId: string, visitorId: string): Promise<GalleryVote | undefined>;
  voteGalleryItem(itemId: string, visitorId: string, voteType: "up" | "down"): Promise<void>;
  incrementGalleryViews(id: string): Promise<void>;
  getGalleryComments(itemId: string): Promise<GalleryCommentWithAvatar[]>;
  createGalleryComment(comment: InsertGalleryComment): Promise<GalleryComment>;
  deleteGalleryComment(id: string): Promise<void>;
  
  // Notifications
  getUserNotifications(userId: string, limit?: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  createBroadcastNotification(notification: Omit<InsertNotification, "userId">): Promise<void>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  
  // Push Subscriptions
  createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  getPushSubscriptionsByUser(userId: string): Promise<PushSubscription[]>;
  getAllPushSubscriptions(): Promise<PushSubscription[]>;
  getPushSubscriptionsForNewPolls(): Promise<Array<PushSubscription & { user: User }>>;
  getPushSubscriptionsForAnnouncements(): Promise<Array<PushSubscription & { userId: string }>>;
  getPushSubscriptionsForWhaleAlerts(): Promise<Array<PushSubscription & { userId: string }>>;
  getPushSubscriptionsForJeetAlarms(): Promise<Array<PushSubscription & { userId: string }>>;
  deletePushSubscription(endpoint: string): Promise<void>;
  deletePushSubscriptionsByUser(userId: string): Promise<void>;
  
  // Jeet Sells (sell transactions for leaderboard)
  createJeetSell(sell: InsertJeetSell): Promise<JeetSell>;
  getJeetSellBySignature(signature: string): Promise<JeetSell | undefined>;
  getJeetLeaderboard(limit?: number, range?: "24h" | "7d" | "30d" | "all"): Promise<JeetLeaderboardEntry[]>;
  
  // Jeet Wallet Totals (aggregated data for fast leaderboard)
  upsertJeetWalletTotal(walletAddress: string, soldAmount: number, soldValueSol: number | null, sellTime: Date): Promise<void>;
  getJeetWalletTotalsLeaderboard(limit?: number): Promise<JeetLeaderboardEntry[]>;
  getJeetSellCount(): Promise<number>;
  
  // Wallet Holdings (for Diamond Hands & Whale leaderboards)
  createWalletBuy(buy: InsertWalletBuy): Promise<WalletBuy>;
  getWalletBuyBySignature(signature: string): Promise<WalletBuy | undefined>;
  upsertWalletHolding(walletAddress: string, boughtAmount: number, buyTime: Date): Promise<void>;
  updateWalletHoldingOnSell(walletAddress: string, soldAmount: number, sellTime: Date): Promise<void>;
  syncWalletBalance(walletAddress: string, actualBalance: number): Promise<void>;
  upsertHolderWithBalance(walletAddress: string, balance: number): Promise<void>;
  getAllTrackedWallets(): Promise<string[]>;
  getDiamondHandsLeaderboard(limit?: number): Promise<DiamondHandsEntry[]>;
  getWhalesLeaderboard(limit?: number): Promise<WhaleEntry[]>;
  getWalletHolding(walletAddress: string): Promise<WalletHolding | undefined>;
  getWalletBuyCount(): Promise<number>;
  getWalletHoldingsCount(): Promise<number>;
  
  // Link wallet to user account
  linkWalletHoldingToUser(walletAddress: string, userId: string): Promise<void>;
  unlinkWalletHoldingFromUser(walletAddress: string): Promise<void>;
  backfillWalletHoldingsUserIds(): Promise<number>;
  getWalletHoldings(walletAddress: string): Promise<WalletHolding | undefined>;
  
  // Founder Wallet Management
  getFounderWallets(userId: string): Promise<FounderWallet[]>;
  getFounderWallet(id: string): Promise<FounderWallet | undefined>;
  getFounderWalletByAddress(walletAddress: string): Promise<FounderWallet | undefined>;
  createFounderWallet(wallet: InsertFounderWallet): Promise<FounderWallet>;
  updateFounderWallet(id: string, data: Partial<InsertFounderWallet>): Promise<FounderWallet | undefined>;
  deleteFounderWallet(id: string): Promise<void>;
  getAllFounderWalletAddresses(): Promise<string[]>;
  getFounderWalletsToExcludeFromLeaderboard(): Promise<string[]>;
  
  // Friendships
  sendFriendRequest(requesterId: string, addresseeId: string): Promise<Friendship>;
  getFriendRequest(id: string): Promise<Friendship | undefined>;
  getFriendshipBetweenUsers(userId1: string, userId2: string): Promise<Friendship | undefined>;
  getPendingFriendRequests(userId: string): Promise<PendingFriendRequest[]>;
  getSentFriendRequests(userId: string): Promise<Friendship[]>;
  getFriends(userId: string): Promise<FriendWithDetails[]>;
  acceptFriendRequest(friendshipId: string): Promise<Friendship | undefined>;
  declineFriendRequest(friendshipId: string): Promise<Friendship | undefined>;
  cancelFriendRequest(friendshipId: string): Promise<void>;
  unfriend(friendshipId: string): Promise<void>;
  areFriends(userId1: string, userId2: string): Promise<boolean>;
  
  // Private Conversations
  createConversation(participant1Id: string, participant2Id: string): Promise<PrivateConversation>;
  getConversation(id: string): Promise<PrivateConversation | undefined>;
  getConversationBetweenUsers(userId1: string, userId2: string): Promise<PrivateConversation | undefined>;
  getUserConversations(userId: string): Promise<PrivateConversation[]>;
  updateConversationLastMessage(conversationId: string): Promise<void>;
  
  // Private Messages
  createPrivateMessage(message: InsertPrivateMessage): Promise<PrivateMessage>;
  getPrivateMessages(conversationId: string, limit?: number, before?: Date): Promise<PrivateMessage[]>;
  markMessagesAsRead(conversationId: string, userId: string): Promise<void>;
  getUnreadMessageCount(userId: string): Promise<number>;
  deletePrivateMessage(messageId: string): Promise<void>;
  
  // Encryption Keys
  getUserEncryptionKey(userId: string): Promise<UserEncryptionKey | undefined>;
  setUserEncryptionKey(userId: string, publicKey: string): Promise<UserEncryptionKey>;
  
  // User Reports
  createReport(report: InsertUserReport): Promise<UserReport>;
  getReport(id: string): Promise<UserReport | undefined>;
  getReportsByStatus(status: string, limit?: number): Promise<UserReport[]>;
  getReportsByUser(reporterId: string): Promise<UserReport[]>;
  getReportsAgainstUser(reportedUserId: string): Promise<UserReport[]>;
  resolveReport(reportId: string, resolution: string, resolvedBy: string): Promise<UserReport | undefined>;
  dismissReport(reportId: string, resolvedBy: string): Promise<UserReport | undefined>;
  countPendingReports(): Promise<number>;
  getPendingReportByReporterAndTarget(reporterId: string, reportedUserId: string): Promise<UserReport | undefined>;
  
  // User Blocks
  blockUser(blockerId: string, blockedId: string, reason?: string): Promise<UserBlock>;
  unblockUser(blockerId: string, blockedId: string): Promise<void>;
  getBlockedUsers(blockerId: string): Promise<UserBlock[]>;
  isBlocked(blockerId: string, blockedId: string): Promise<boolean>;
  isBlockedEitherWay(userId1: string, userId2: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByWallet(walletAddress: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async banUser(id: string, bannedUntil?: Date | null): Promise<void> {
    await db.update(users).set({ 
      bannedAt: new Date(),
      bannedUntil: bannedUntil || null,
    }).where(eq(users.id, id));
  }

  async unbanUser(id: string): Promise<void> {
    await db.update(users).set({ 
      bannedAt: null,
      bannedUntil: null,
    }).where(eq(users.id, id));
  }

  async countUsers(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(users);
    return Number(result?.count || 0);
  }

  // Sessions
  async createSession(session: InsertSession): Promise<Session> {
    const [created] = await db.insert(sessions).values(session).returning();
    return created;
  }

  async getSessionByToken(token: string): Promise<Session | undefined> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())));
    return session;
  }

  async deleteSession(id: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }

  // Password Reset
  async createPasswordResetToken(data: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [created] = await db.insert(passwordResetTokens).values(data).returning();
    return created;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          eq(passwordResetTokens.used, false),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      );
    return resetToken;
  }

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    await db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.id, id));
  }

  // Auth Challenges
  async createAuthChallenge(data: InsertAuthChallenge): Promise<AuthChallenge> {
    const [created] = await db.insert(authChallenges).values(data).returning();
    return created;
  }

  async getAuthChallenge(walletAddress: string, challenge: string): Promise<AuthChallenge | undefined> {
    const [authChallenge] = await db
      .select()
      .from(authChallenges)
      .where(
        and(
          eq(authChallenges.walletAddress, walletAddress),
          eq(authChallenges.challenge, challenge),
          eq(authChallenges.used, false),
          gt(authChallenges.expiresAt, new Date())
        )
      );
    return authChallenge;
  }

  async markAuthChallengeUsed(id: string): Promise<void> {
    await db.update(authChallenges).set({ used: true }).where(eq(authChallenges.id, id));
  }

  // Icons
  async getActiveIcons(): Promise<Icon[]> {
    return db.select().from(icons).where(eq(icons.isActive, true));
  }

  async getAllIcons(): Promise<Icon[]> {
    return db.select().from(icons).orderBy(desc(icons.createdAt));
  }

  async getIcon(id: string): Promise<Icon | undefined> {
    const [icon] = await db.select().from(icons).where(eq(icons.id, id));
    return icon;
  }

  async createIcon(icon: InsertIcon): Promise<Icon> {
    const [created] = await db.insert(icons).values(icon).returning();
    return created;
  }

  async updateIcon(id: string, data: Partial<InsertIcon>): Promise<Icon | undefined> {
    const [updated] = await db
      .update(icons)
      .set(data)
      .where(eq(icons.id, id))
      .returning();
    return updated;
  }

  async deleteIcon(id: string): Promise<void> {
    // First, unset this icon from any users using it
    await db.update(users).set({ selectedIconId: null }).where(eq(users.selectedIconId, id));
    await db.delete(icons).where(eq(icons.id, id));
  }

  // Stored Dev Buys
  async createStoredDevBuy(buy: InsertStoredDevBuy): Promise<StoredDevBuy> {
    const [created] = await db.insert(storedDevBuys).values(buy).returning();
    return created;
  }

  async getStoredDevBuyBySignature(signature: string): Promise<StoredDevBuy | undefined> {
    const [buy] = await db.select().from(storedDevBuys).where(eq(storedDevBuys.signature, signature));
    return buy;
  }

  async getStoredDevBuys(limit: number = 50): Promise<StoredDevBuy[]> {
    return db.select().from(storedDevBuys).orderBy(desc(storedDevBuys.timestamp)).limit(limit);
  }

  async getStoredDevBuysInRange(startDate: Date, endDate: Date): Promise<StoredDevBuy[]> {
    return db.select().from(storedDevBuys)
      .where(and(gte(storedDevBuys.timestamp, startDate), lte(storedDevBuys.timestamp, endDate)))
      .orderBy(desc(storedDevBuys.timestamp));
  }

  async getAllStoredDevBuys(): Promise<StoredDevBuy[]> {
    return db.select().from(storedDevBuys).orderBy(desc(storedDevBuys.timestamp));
  }

  // Whale Buys
  async createWhaleBuy(buy: InsertWhaleBuy): Promise<WhaleBuy> {
    const [created] = await db.insert(whaleBuys).values(buy).returning();
    return created;
  }

  async getWhaleBuyBySignature(signature: string): Promise<WhaleBuy | undefined> {
    const [buy] = await db.select().from(whaleBuys).where(eq(whaleBuys.signature, signature));
    return buy;
  }

  async getWhaleBuys(limit: number = 50): Promise<WhaleBuy[]> {
    return db.select().from(whaleBuys).orderBy(desc(whaleBuys.timestamp)).limit(limit);
  }

  async getWhaleBuysInRange(startDate: Date, endDate: Date): Promise<WhaleBuy[]> {
    return db.select().from(whaleBuys)
      .where(and(gte(whaleBuys.timestamp, startDate), lte(whaleBuys.timestamp, endDate)))
      .orderBy(desc(whaleBuys.timestamp));
  }

  async getAllWhaleBuys(): Promise<WhaleBuy[]> {
    return db.select().from(whaleBuys).orderBy(desc(whaleBuys.timestamp));
  }

  // Admin User Management
  async getAllUsersWithStats(): Promise<Array<User & { messageCount: number; galleryCount: number }>> {
    const results = await db
      .select({
        user: users,
        messageCount: sql<number>`(SELECT COUNT(*) FROM chat_messages WHERE sender_id = ${users.id} AND is_deleted = false)::int`,
        galleryCount: sql<number>`(SELECT COUNT(*) FROM gallery_items WHERE creator_id = ${users.id})::int`,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
    
    return results.map(r => ({
      ...r.user,
      messageCount: r.messageCount || 0,
      galleryCount: r.galleryCount || 0,
    }));
  }

  async getUserChatMessages(userId: string, limit: number = 50): Promise<ChatMessage[]> {
    return db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.senderId, userId), eq(chatMessages.isDeleted, false)))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  async getUserGalleryItems(userId: string): Promise<GalleryItem[]> {
    return db
      .select()
      .from(galleryItems)
      .where(eq(galleryItems.creatorId, userId))
      .orderBy(desc(galleryItems.createdAt));
  }

  async deleteAllSessions(): Promise<number> {
    const result = await db.delete(sessions).returning();
    return result.length;
  }

  // NFT Collections
  async createNftCollection(collection: InsertNftCollection): Promise<NftCollection> {
    const [created] = await db.insert(nftCollections).values(collection).returning();
    return created;
  }

  async getNftCollection(id: string): Promise<NftCollection | undefined> {
    const [collection] = await db.select().from(nftCollections).where(eq(nftCollections.id, id));
    return collection;
  }

  async getNftCollectionBySymbol(symbol: string): Promise<NftCollection | undefined> {
    const [collection] = await db.select().from(nftCollections).where(eq(nftCollections.symbol, symbol));
    return collection;
  }

  async getAllNftCollections(limit: number = 50): Promise<NftCollection[]> {
    return db.select().from(nftCollections).orderBy(desc(nftCollections.totalVolume)).limit(limit);
  }

  async getVerifiedNftCollections(): Promise<NftCollection[]> {
    return db.select().from(nftCollections).where(eq(nftCollections.verified, true)).orderBy(desc(nftCollections.totalVolume));
  }

  async updateNftCollection(id: string, data: Partial<InsertNftCollection>): Promise<NftCollection | undefined> {
    const [updated] = await db
      .update(nftCollections)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(nftCollections.id, id))
      .returning();
    return updated;
  }

  async searchNftCollections(query: string, limit: number = 20): Promise<NftCollection[]> {
    return db.select().from(nftCollections)
      .where(or(
        ilike(nftCollections.name, `%${query}%`),
        ilike(nftCollections.symbol, `%${query}%`)
      ))
      .orderBy(desc(nftCollections.totalVolume))
      .limit(limit);
  }

  // NFTs
  async createNft(nft: InsertNft): Promise<Nft> {
    const [created] = await db.insert(nfts).values(nft).returning();
    return created;
  }

  async getNft(id: string): Promise<Nft | undefined> {
    const [nft] = await db.select().from(nfts).where(eq(nfts.id, id));
    return nft;
  }

  async getNftByMint(mintAddress: string): Promise<Nft | undefined> {
    const [nft] = await db.select().from(nfts).where(eq(nfts.mintAddress, mintAddress));
    return nft;
  }

  async getNftsByOwner(ownerId: string): Promise<Nft[]> {
    return db.select().from(nfts).where(eq(nfts.ownerId, ownerId)).orderBy(desc(nfts.createdAt));
  }

  async getNftsByOwnerAddress(ownerAddress: string): Promise<Nft[]> {
    return db.select().from(nfts).where(eq(nfts.ownerAddress, ownerAddress)).orderBy(desc(nfts.createdAt));
  }

  async getNftsByCollection(collectionId: string, limit: number = 50, offset: number = 0): Promise<Nft[]> {
    return db.select().from(nfts)
      .where(eq(nfts.collectionId, collectionId))
      .orderBy(asc(nfts.rarityRank))
      .limit(limit)
      .offset(offset);
  }

  async updateNft(id: string, data: Partial<InsertNft>): Promise<Nft | undefined> {
    const [updated] = await db
      .update(nfts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(nfts.id, id))
      .returning();
    return updated;
  }

  async searchNfts(query: string, limit: number = 20): Promise<Nft[]> {
    return db.select().from(nfts)
      .where(or(
        ilike(nfts.name, `%${query}%`),
        ilike(nfts.mintAddress, `%${query}%`)
      ))
      .orderBy(desc(nfts.createdAt))
      .limit(limit);
  }

  // NFT Listings
  async createNftListing(listing: InsertNftListing): Promise<NftListing> {
    const [created] = await db.insert(nftListings).values(listing).returning();
    return created;
  }

  async getNftListing(id: string): Promise<NftListing | undefined> {
    const [listing] = await db.select().from(nftListings).where(eq(nftListings.id, id));
    return listing;
  }

  async getActiveNftListingByNft(nftId: string): Promise<NftListing | undefined> {
    const [listing] = await db.select().from(nftListings)
      .where(and(eq(nftListings.nftId, nftId), eq(nftListings.status, "active")));
    return listing;
  }

  async getActiveListings(limit: number = 50, offset: number = 0): Promise<Array<NftListing & { nft: Nft }>> {
    const results = await db.select({
      listing: nftListings,
      nft: nfts,
    })
    .from(nftListings)
    .innerJoin(nfts, eq(nftListings.nftId, nfts.id))
    .where(eq(nftListings.status, "active"))
    .orderBy(desc(nftListings.listedAt))
    .limit(limit)
    .offset(offset);
    
    return results.map(r => ({ ...r.listing, nft: r.nft }));
  }

  async getListingsBySeller(sellerId: string): Promise<NftListing[]> {
    return db.select().from(nftListings)
      .where(eq(nftListings.sellerId, sellerId))
      .orderBy(desc(nftListings.listedAt));
  }

  async getListingsByCollection(collectionId: string, limit: number = 50): Promise<Array<NftListing & { nft: Nft }>> {
    const results = await db.select({
      listing: nftListings,
      nft: nfts,
    })
    .from(nftListings)
    .innerJoin(nfts, eq(nftListings.nftId, nfts.id))
    .where(and(eq(nfts.collectionId, collectionId), eq(nftListings.status, "active")))
    .orderBy(asc(nftListings.priceSol))
    .limit(limit);
    
    return results.map(r => ({ ...r.listing, nft: r.nft }));
  }

  async updateNftListing(id: string, data: Partial<InsertNftListing>): Promise<NftListing | undefined> {
    const [updated] = await db
      .update(nftListings)
      .set(data)
      .where(eq(nftListings.id, id))
      .returning();
    return updated;
  }

  async cancelNftListing(id: string): Promise<void> {
    await db.update(nftListings)
      .set({ status: "cancelled", cancelledAt: new Date() })
      .where(eq(nftListings.id, id));
  }

  async markListingSold(id: string): Promise<boolean> {
    // Atomic update - only marks as sold if currently active (prevents race conditions)
    const [updated] = await db.update(nftListings)
      .set({ status: "sold", soldAt: new Date() })
      .where(and(eq(nftListings.id, id), eq(nftListings.status, "active")))
      .returning();
    return !!updated;
  }

  // NFT Offers
  async createNftOffer(offer: InsertNftOffer): Promise<NftOffer> {
    const [created] = await db.insert(nftOffers).values(offer).returning();
    return created;
  }

  async getNftOffer(id: string): Promise<NftOffer | undefined> {
    const [offer] = await db.select().from(nftOffers).where(eq(nftOffers.id, id));
    return offer;
  }

  async getOffersByNft(nftId: string): Promise<NftOffer[]> {
    return db.select().from(nftOffers)
      .where(eq(nftOffers.nftId, nftId))
      .orderBy(desc(nftOffers.offerAmountSol));
  }

  async getOffersByBuyer(buyerId: string): Promise<NftOffer[]> {
    return db.select().from(nftOffers)
      .where(eq(nftOffers.buyerId, buyerId))
      .orderBy(desc(nftOffers.createdAt));
  }

  async getPendingOffersByListing(listingId: string): Promise<NftOffer[]> {
    return db.select().from(nftOffers)
      .where(and(eq(nftOffers.listingId, listingId), eq(nftOffers.status, "pending")))
      .orderBy(desc(nftOffers.offerAmountSol));
  }

  async updateNftOffer(id: string, data: Partial<InsertNftOffer>): Promise<NftOffer | undefined> {
    const [updated] = await db
      .update(nftOffers)
      .set(data)
      .where(eq(nftOffers.id, id))
      .returning();
    return updated;
  }

  async acceptNftOffer(id: string): Promise<void> {
    await db.update(nftOffers)
      .set({ status: "accepted", respondedAt: new Date() })
      .where(eq(nftOffers.id, id));
  }

  async rejectNftOffer(id: string): Promise<void> {
    await db.update(nftOffers)
      .set({ status: "rejected", respondedAt: new Date() })
      .where(eq(nftOffers.id, id));
  }

  // NFT Transactions
  async createNftTransaction(tx: InsertNftTransaction): Promise<NftTransaction> {
    const [created] = await db.insert(nftTransactions).values(tx).returning();
    return created;
  }

  async getNftTransactions(nftId: string, limit: number = 20): Promise<NftTransaction[]> {
    return db.select().from(nftTransactions)
      .where(eq(nftTransactions.nftId, nftId))
      .orderBy(desc(nftTransactions.createdAt))
      .limit(limit);
  }

  async getRecentSales(limit: number = 20): Promise<NftTransaction[]> {
    return db.select().from(nftTransactions)
      .where(eq(nftTransactions.transactionType, "sale"))
      .orderBy(desc(nftTransactions.createdAt))
      .limit(limit);
  }

  async getUserTransactions(userId: string, limit: number = 50): Promise<NftTransaction[]> {
    return db.select().from(nftTransactions)
      .where(or(eq(nftTransactions.fromUserId, userId), eq(nftTransactions.toUserId, userId)))
      .orderBy(desc(nftTransactions.createdAt))
      .limit(limit);
  }

  // NFT Favorites
  async addNftFavorite(favorite: InsertNftFavorite): Promise<NftFavorite> {
    const [created] = await db.insert(nftFavorites).values(favorite).returning();
    return created;
  }

  async removeNftFavorite(userId: string, nftId?: string, collectionId?: string): Promise<void> {
    if (nftId) {
      await db.delete(nftFavorites).where(and(eq(nftFavorites.userId, userId), eq(nftFavorites.nftId, nftId)));
    } else if (collectionId) {
      await db.delete(nftFavorites).where(and(eq(nftFavorites.userId, userId), eq(nftFavorites.collectionId, collectionId)));
    }
  }

  async getUserFavoriteNfts(userId: string): Promise<Nft[]> {
    const favorites = await db.select({ nft: nfts })
      .from(nftFavorites)
      .innerJoin(nfts, eq(nftFavorites.nftId, nfts.id))
      .where(eq(nftFavorites.userId, userId));
    return favorites.map(f => f.nft);
  }

  async getUserFavoriteCollections(userId: string): Promise<NftCollection[]> {
    const favorites = await db.select({ collection: nftCollections })
      .from(nftFavorites)
      .innerJoin(nftCollections, eq(nftFavorites.collectionId, nftCollections.id))
      .where(eq(nftFavorites.userId, userId));
    return favorites.map(f => f.collection);
  }

  async isNftFavorited(userId: string, nftId: string): Promise<boolean> {
    const [favorite] = await db.select().from(nftFavorites)
      .where(and(eq(nftFavorites.userId, userId), eq(nftFavorites.nftId, nftId)));
    return !!favorite;
  }

  // Marketplace Config
  async getMarketplaceConfig(key: string): Promise<string | undefined> {
    const [config] = await db.select().from(marketplaceConfig).where(eq(marketplaceConfig.key, key));
    return config?.value;
  }

  async setMarketplaceConfig(key: string, value: string): Promise<void> {
    await db.insert(marketplaceConfig)
      .values({ key, value })
      .onConflictDoUpdate({ target: marketplaceConfig.key, set: { value, updatedAt: new Date() } });
  }

  // Chat Rooms
  async createChatRoom(room: InsertChatRoom): Promise<ChatRoom> {
    const [created] = await db.insert(chatRooms).values(room).returning();
    return created;
  }

  async createChatRoomWithId(room: InsertChatRoomWithId): Promise<ChatRoom> {
    const [created] = await db.insert(chatRooms).values(room).returning();
    return created;
  }

  async getChatRoom(id: string): Promise<ChatRoom | undefined> {
    const [room] = await db.select().from(chatRooms).where(eq(chatRooms.id, id));
    return room;
  }

  async getPublicChatRooms(): Promise<ChatRoom[]> {
    return db
      .select()
      .from(chatRooms)
      .where(and(eq(chatRooms.type, "public"), eq(chatRooms.isActive, true)));
  }

  // Chat Messages
  async createChatMessage(msg: InsertChatMessage): Promise<ChatMessage> {
    const [created] = await db.insert(chatMessages).values(msg).returning();
    return created;
  }

  async getChatMessages(roomId: string, limit: number = 50): Promise<ChatMessageWithAvatar[]> {
    const messages = await db
      .select({
        id: chatMessages.id,
        roomId: chatMessages.roomId,
        senderId: chatMessages.senderId,
        senderName: chatMessages.senderName,
        content: chatMessages.content,
        fileUrl: chatMessages.fileUrl,
        isDeleted: chatMessages.isDeleted,
        createdAt: chatMessages.createdAt,
        senderAvatarUrl: users.avatarUrl,
        senderRole: users.role,
      })
      .from(chatMessages)
      .leftJoin(users, eq(chatMessages.senderId, users.id))
      .where(and(eq(chatMessages.roomId, roomId), eq(chatMessages.isDeleted, false)))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
    return messages;
  }

  async markMessageDeleted(id: string): Promise<void> {
    await db.update(chatMessages).set({ isDeleted: true }).where(eq(chatMessages.id, id));
  }

  // Chat Room Members
  async addChatRoomMember(member: InsertChatRoomMember): Promise<ChatRoomMember> {
    const [created] = await db.insert(chatRoomMembers).values(member).returning();
    return created;
  }

  async removeChatRoomMember(roomId: string, oduserId: string): Promise<void> {
    await db
      .delete(chatRoomMembers)
      .where(and(eq(chatRoomMembers.roomId, roomId), eq(chatRoomMembers.userId, oduserId)));
  }

  async getChatRoomMembers(roomId: string): Promise<ChatRoomMember[]> {
    return db.select().from(chatRoomMembers).where(eq(chatRoomMembers.roomId, roomId));
  }

  async isRoomMember(roomId: string, userId: string): Promise<boolean> {
    const [member] = await db
      .select()
      .from(chatRoomMembers)
      .where(and(eq(chatRoomMembers.roomId, roomId), eq(chatRoomMembers.userId, userId)));
    return !!member;
  }

  // Polls
  async getActivePolls(): Promise<Array<PollDb & { options: PollOption[] }>> {
    const activePollsList = await db
      .select()
      .from(polls)
      .where(eq(polls.isActive, true))
      .orderBy(desc(polls.createdAt));
    
    const pollsWithOptions = await Promise.all(
      activePollsList.map(async (poll) => {
        const options = await db
          .select()
          .from(pollOptions)
          .where(eq(pollOptions.pollId, poll.id));
        return { ...poll, options };
      })
    );
    
    return pollsWithOptions;
  }

  async getPoll(id: string): Promise<(PollDb & { options: PollOption[] }) | undefined> {
    const [poll] = await db.select().from(polls).where(eq(polls.id, id));
    if (!poll) return undefined;
    
    const options = await db
      .select()
      .from(pollOptions)
      .where(eq(pollOptions.pollId, id));
    
    return { ...poll, options };
  }

  async createPoll(poll: InsertPollDb, optionTexts: string[]): Promise<PollDb> {
    const [created] = await db.insert(polls).values(poll).returning();
    
    for (const text of optionTexts) {
      await db.insert(pollOptions).values({ pollId: created.id, text });
    }
    
    return created;
  }

  async hasVoted(pollId: string, visitorId: string): Promise<boolean> {
    const [vote] = await db
      .select()
      .from(pollVotes)
      .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.visitorId, visitorId)));
    return !!vote;
  }

  async vote(pollId: string, optionId: string, visitorId: string): Promise<void> {
    await db.insert(pollVotes).values({ pollId, optionId, visitorId });
    await db
      .update(pollOptions)
      .set({ votes: sql`${pollOptions.votes} + 1` })
      .where(eq(pollOptions.id, optionId));
  }

  async getAllPolls(): Promise<Array<PollDb & { options: PollOption[] }>> {
    const allPollsList = await db
      .select()
      .from(polls)
      .orderBy(desc(polls.createdAt));
    
    const pollsWithOptions = await Promise.all(
      allPollsList.map(async (poll) => {
        const options = await db
          .select()
          .from(pollOptions)
          .where(eq(pollOptions.pollId, poll.id));
        return { ...poll, options };
      })
    );
    
    return pollsWithOptions;
  }

  async deletePoll(id: string): Promise<void> {
    await db.delete(polls).where(eq(polls.id, id));
  }

  // Activity Feed
  async getRecentActivity(limit: number = 20): Promise<ActivityItemDb[]> {
    return db
      .select()
      .from(activityItems)
      .orderBy(desc(activityItems.createdAt))
      .limit(limit);
  }

  async createActivityItem(item: InsertActivityItemDb): Promise<ActivityItemDb> {
    const [created] = await db.insert(activityItems).values(item).returning();
    return created;
  }

  // Gallery
  async getApprovedGalleryItems(limit: number = 50): Promise<GalleryItem[]> {
    return db
      .select()
      .from(galleryItems)
      .where(eq(galleryItems.status, "approved"))
      .orderBy(desc(galleryItems.createdAt))
      .limit(limit);
  }

  async getPendingGalleryItems(): Promise<GalleryItem[]> {
    return db
      .select()
      .from(galleryItems)
      .where(eq(galleryItems.status, "pending"))
      .orderBy(desc(galleryItems.createdAt));
  }

  async getFeaturedGalleryItems(): Promise<GalleryItem[]> {
    return db
      .select()
      .from(galleryItems)
      .where(and(eq(galleryItems.status, "approved"), eq(galleryItems.featured, true)))
      .orderBy(desc(galleryItems.createdAt));
  }

  async getGalleryItem(id: string): Promise<GalleryItem | undefined> {
    const [item] = await db.select().from(galleryItems).where(eq(galleryItems.id, id));
    return item;
  }

  async createGalleryItem(item: InsertGalleryItem): Promise<GalleryItem> {
    const [created] = await db.insert(galleryItems).values(item).returning();
    return created;
  }

  async updateGalleryItem(id: string, data: Partial<InsertGalleryItem>): Promise<GalleryItem | undefined> {
    const [updated] = await db
      .update(galleryItems)
      .set(data)
      .where(eq(galleryItems.id, id))
      .returning();
    return updated;
  }

  async approveGalleryItem(id: string): Promise<void> {
    await db.update(galleryItems).set({ status: "approved" }).where(eq(galleryItems.id, id));
  }

  async rejectGalleryItem(id: string, reason?: string): Promise<GalleryItem | undefined> {
    const [item] = await db.select().from(galleryItems).where(eq(galleryItems.id, id));
    await db.update(galleryItems).set({ status: "rejected" }).where(eq(galleryItems.id, id));
    return item;
  }

  async deleteGalleryItem(id: string): Promise<void> {
    await db.delete(galleryVotes).where(eq(galleryVotes.galleryItemId, id));
    await db.delete(galleryComments).where(eq(galleryComments.galleryItemId, id));
    await db.delete(galleryItems).where(eq(galleryItems.id, id));
  }

  async featureGalleryItem(id: string, featured: boolean): Promise<void> {
    await db.update(galleryItems).set({ featured }).where(eq(galleryItems.id, id));
  }

  async hasGalleryVoted(itemId: string, visitorId: string): Promise<GalleryVote | undefined> {
    const [vote] = await db
      .select()
      .from(galleryVotes)
      .where(and(eq(galleryVotes.galleryItemId, itemId), eq(galleryVotes.visitorId, visitorId)));
    return vote;
  }

  async voteGalleryItem(itemId: string, visitorId: string, voteType: "up" | "down"): Promise<void> {
    const existingVote = await this.hasGalleryVoted(itemId, visitorId);
    
    if (existingVote) {
      if (existingVote.voteType === voteType) {
        return;
      }
      await db.delete(galleryVotes).where(eq(galleryVotes.id, existingVote.id));
      if (existingVote.voteType === "up") {
        await db.update(galleryItems).set({ upvotes: sql`${galleryItems.upvotes} - 1` }).where(eq(galleryItems.id, itemId));
      } else {
        await db.update(galleryItems).set({ downvotes: sql`${galleryItems.downvotes} - 1` }).where(eq(galleryItems.id, itemId));
      }
    }
    
    await db.insert(galleryVotes).values({ galleryItemId: itemId, visitorId, voteType });
    
    if (voteType === "up") {
      await db.update(galleryItems).set({ upvotes: sql`${galleryItems.upvotes} + 1` }).where(eq(galleryItems.id, itemId));
    } else {
      await db.update(galleryItems).set({ downvotes: sql`${galleryItems.downvotes} + 1` }).where(eq(galleryItems.id, itemId));
    }
  }

  async incrementGalleryViews(id: string): Promise<void> {
    await db.update(galleryItems).set({ views: sql`${galleryItems.views} + 1` }).where(eq(galleryItems.id, id));
  }

  async getGalleryComments(itemId: string): Promise<GalleryCommentWithAvatar[]> {
    const comments = await db
      .select({
        id: galleryComments.id,
        galleryItemId: galleryComments.galleryItemId,
        userId: galleryComments.userId,
        visitorName: galleryComments.visitorName,
        content: galleryComments.content,
        isDeleted: galleryComments.isDeleted,
        createdAt: galleryComments.createdAt,
        userAvatarUrl: users.avatarUrl,
      })
      .from(galleryComments)
      .leftJoin(users, eq(galleryComments.userId, users.id))
      .where(and(eq(galleryComments.galleryItemId, itemId), eq(galleryComments.isDeleted, false)))
      .orderBy(desc(galleryComments.createdAt));
    return comments;
  }

  async createGalleryComment(comment: InsertGalleryComment): Promise<GalleryComment> {
    const [created] = await db.insert(galleryComments).values(comment).returning();
    return created;
  }

  async deleteGalleryComment(id: string): Promise<void> {
    await db.update(galleryComments).set({ isDeleted: true }).where(eq(galleryComments.id, id));
  }

  // Leaderboard
  async getTopMemeCreators(limit: number = 10): Promise<{ userId: string; username: string; avatarUrl?: string; score: number; rank: number }[]> {
    // Join gallery items by creator_id OR by matching username when creator_id is null
    // Include creators with any approved artwork (count > 0), ordered by upvotes then by item count
    const results = await db
      .select({
        userId: users.id,
        username: users.username,
        avatarUrl: users.avatarUrl,
        totalUpvotes: sql<number>`COALESCE(SUM(${galleryItems.upvotes}), 0)::int`,
        itemCount: sql<number>`COUNT(${galleryItems.id})::int`,
      })
      .from(users)
      .leftJoin(galleryItems, and(
        eq(galleryItems.status, "approved"),
        sql`(${galleryItems.creatorId} = ${users.id} OR (${galleryItems.creatorId} IS NULL AND ${galleryItems.creatorName} = ${users.username}))`
      ))
      .groupBy(users.id, users.username, users.avatarUrl)
      .having(sql`COUNT(${galleryItems.id}) > 0`)
      .orderBy(sql`COALESCE(SUM(${galleryItems.upvotes}), 0) DESC`, sql`COUNT(${galleryItems.id}) DESC`)
      .limit(limit);
    
    return results.map((r, i) => ({
      userId: r.userId,
      username: r.username,
      avatarUrl: r.avatarUrl || undefined,
      score: r.totalUpvotes,
      rank: i + 1,
    }));
  }

  async getTopChatters(limit: number = 10): Promise<{ userId: string; username: string; avatarUrl?: string; score: number; rank: number }[]> {
    const results = await db
      .select({
        userId: users.id,
        username: users.username,
        avatarUrl: users.avatarUrl,
        messageCount: sql<number>`COUNT(${chatMessages.id})::int`,
      })
      .from(users)
      .leftJoin(chatMessages, and(
        eq(chatMessages.senderId, users.id),
        eq(chatMessages.isDeleted, false)
      ))
      .groupBy(users.id, users.username, users.avatarUrl)
      .having(sql`COUNT(${chatMessages.id}) > 0`)
      .orderBy(sql`COUNT(${chatMessages.id}) DESC`)
      .limit(limit);
    
    return results.map((r, i) => ({
      userId: r.userId,
      username: r.username,
      avatarUrl: r.avatarUrl || undefined,
      score: r.messageCount,
      rank: i + 1,
    }));
  }

  // Notifications
  async getUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result[0]?.count || 0;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async createBroadcastNotification(notification: Omit<InsertNotification, "userId">): Promise<void> {
    const allUsers = await this.getAllUsers();
    const notificationValues = allUsers.map(user => ({
      ...notification,
      userId: user.id,
    }));
    if (notificationValues.length > 0) {
      await db.insert(notifications).values(notificationValues);
    }
  }

  async markNotificationRead(id: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  // Push Subscriptions
  async createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    // Delete existing subscription for this endpoint first
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, subscription.endpoint));
    const [created] = await db.insert(pushSubscriptions).values(subscription).returning();
    return created;
  }

  async getPushSubscriptionsByUser(userId: string): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  async getAllPushSubscriptions(): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions);
  }

  async getPushSubscriptionsForNewPolls(): Promise<Array<PushSubscription & { user: User }>> {
    const results = await db
      .select({
        subscription: pushSubscriptions,
        user: users,
      })
      .from(pushSubscriptions)
      .innerJoin(users, eq(pushSubscriptions.userId, users.id))
      .where(eq(users.notifyNewPolls, true));
    
    return results.map(r => ({ ...r.subscription, user: r.user }));
  }

  async getPushSubscriptionsForAnnouncements(): Promise<Array<PushSubscription & { userId: string }>> {
    const results = await db
      .select({
        subscription: pushSubscriptions,
        user: users,
      })
      .from(pushSubscriptions)
      .innerJoin(users, eq(pushSubscriptions.userId, users.id))
      .where(eq(users.notifyAnnouncements, true));
    
    return results.map(r => ({ ...r.subscription, userId: r.user.id }));
  }

  async getPushSubscriptionsForWhaleAlerts(): Promise<Array<PushSubscription & { userId: string }>> {
    const results = await db
      .select({
        subscription: pushSubscriptions,
        user: users,
      })
      .from(pushSubscriptions)
      .innerJoin(users, eq(pushSubscriptions.userId, users.id))
      .where(eq(users.notifyWhaleAlerts, true));
    
    return results.map(r => ({ ...r.subscription, userId: r.user.id }));
  }

  async getPushSubscriptionsForJeetAlarms(): Promise<Array<PushSubscription & { userId: string }>> {
    const results = await db
      .select({
        subscription: pushSubscriptions,
        user: users,
      })
      .from(pushSubscriptions)
      .innerJoin(users, eq(pushSubscriptions.userId, users.id))
      .where(eq(users.notifyJeetAlarms, true));
    
    return results.map(r => ({ ...r.subscription, userId: r.user.id }));
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }

  async deletePushSubscriptionsByUser(userId: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  // Jeet Sells
  async createJeetSell(sell: InsertJeetSell): Promise<JeetSell> {
    const [created] = await db.insert(jeetSells).values(sell).returning();
    return created;
  }

  async getJeetSellBySignature(signature: string): Promise<JeetSell | undefined> {
    const [sell] = await db.select().from(jeetSells).where(eq(jeetSells.signature, signature));
    return sell;
  }

  async getJeetLeaderboard(limit: number = 10, range: "24h" | "7d" | "30d" | "all" = "all"): Promise<JeetLeaderboardEntry[]> {
    let dateFilter: Date | null = null;
    
    if (range !== "all") {
      const now = new Date();
      switch (range) {
        case "24h":
          dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "7d":
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }
    }
    
    const query = dateFilter
      ? db
          .select({
            walletAddress: jeetSells.walletAddress,
            totalSold: sql<string>`SUM(${jeetSells.soldAmount})`,
            sellCount: sql<number>`COUNT(*)`,
          })
          .from(jeetSells)
          .where(gte(jeetSells.blockTime, dateFilter))
          .groupBy(jeetSells.walletAddress)
          .orderBy(desc(sql`SUM(${jeetSells.soldAmount})`))
          .limit(limit)
      : db
          .select({
            walletAddress: jeetSells.walletAddress,
            totalSold: sql<string>`SUM(${jeetSells.soldAmount})`,
            sellCount: sql<number>`COUNT(*)`,
          })
          .from(jeetSells)
          .groupBy(jeetSells.walletAddress)
          .orderBy(desc(sql`SUM(${jeetSells.soldAmount})`))
          .limit(limit);
    
    const results = await query;
    
    return results.map((row, index) => ({
      rank: index + 1,
      walletAddress: row.walletAddress,
      totalSold: parseFloat(row.totalSold) || 0,
      sellCount: Number(row.sellCount) || 0,
      solscanUrl: `https://solscan.io/account/${row.walletAddress}`,
    }));
  }

  // Jeet Wallet Totals - Aggregated data for fast leaderboard
  async upsertJeetWalletTotal(
    walletAddress: string, 
    soldAmount: number, 
    soldValueSol: number | null, 
    sellTime: Date
  ): Promise<void> {
    await db
      .insert(jeetWalletTotals)
      .values({
        walletAddress,
        totalTokensSold: soldAmount.toString(),
        totalSolValue: soldValueSol?.toString() || "0",
        sellCount: 1,
        firstSellAt: sellTime,
        lastSellAt: sellTime,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: jeetWalletTotals.walletAddress,
        set: {
          totalTokensSold: sql`${jeetWalletTotals.totalTokensSold} + ${soldAmount}`,
          totalSolValue: sql`COALESCE(${jeetWalletTotals.totalSolValue}, 0) + ${soldValueSol || 0}`,
          sellCount: sql`${jeetWalletTotals.sellCount} + 1`,
          lastSellAt: sellTime,
          updatedAt: new Date(),
        },
      });
  }

  async getJeetWalletTotalsLeaderboard(limit: number = 20): Promise<JeetLeaderboardEntry[]> {
    const results = await db
      .select()
      .from(jeetWalletTotals)
      .orderBy(desc(sql`CAST(${jeetWalletTotals.totalTokensSold} AS NUMERIC)`))
      .limit(limit);

    return results.map((row, index) => ({
      rank: index + 1,
      walletAddress: row.walletAddress,
      totalSold: parseFloat(row.totalTokensSold) || 0,
      sellCount: row.sellCount,
      solscanUrl: `https://solscan.io/account/${row.walletAddress}`,
    }));
  }

  async getJeetSellCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(jeetSells);
    return Number(result?.count || 0);
  }

  // Wallet Holdings (for Diamond Hands & Whale leaderboards)
  async createWalletBuy(buy: InsertWalletBuy): Promise<WalletBuy> {
    const [created] = await db.insert(walletBuys).values(buy).returning();
    return created;
  }

  async getWalletBuyBySignature(signature: string): Promise<WalletBuy | undefined> {
    const [buy] = await db.select().from(walletBuys).where(eq(walletBuys.signature, signature));
    return buy;
  }

  async upsertWalletHolding(walletAddress: string, boughtAmount: number, buyTime: Date): Promise<void> {
    await db
      .insert(walletHoldings)
      .values({
        walletAddress,
        currentBalance: boughtAmount.toString(),
        totalBought: boughtAmount.toString(),
        totalSold: "0",
        firstBuyAt: buyTime,
        lastBuyAt: buyTime,
        holdStartAt: buyTime,
        buyCount: 1,
        sellCount: 0,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: walletHoldings.walletAddress,
        set: {
          currentBalance: sql`CAST(${walletHoldings.currentBalance} AS NUMERIC) + ${boughtAmount}`,
          totalBought: sql`CAST(${walletHoldings.totalBought} AS NUMERIC) + ${boughtAmount}`,
          // Keep the EARLIEST buy time for firstBuyAt and holdStartAt
          firstBuyAt: sql`LEAST(${walletHoldings.firstBuyAt}, ${buyTime})`,
          holdStartAt: sql`LEAST(${walletHoldings.holdStartAt}, ${buyTime})`,
          // Keep the LATEST buy time for lastBuyAt
          lastBuyAt: sql`GREATEST(${walletHoldings.lastBuyAt}, ${buyTime})`,
          buyCount: sql`${walletHoldings.buyCount} + 1`,
          updatedAt: new Date(),
        },
      });
  }

  // Sync wallet balance directly from on-chain data (Helius)
  async syncWalletBalance(walletAddress: string, actualBalance: number): Promise<void> {
    await db
      .update(walletHoldings)
      .set({
        currentBalance: actualBalance.toString(),
        updatedAt: new Date(),
      })
      .where(eq(walletHoldings.walletAddress, walletAddress));
  }

  // Create or update holder with actual on-chain balance
  async upsertHolderWithBalance(walletAddress: string, balance: number): Promise<void> {
    await db
      .insert(walletHoldings)
      .values({
        walletAddress,
        currentBalance: balance.toString(),
        totalBought: balance.toString(),
        totalSold: "0",
        firstBuyAt: null,
        lastBuyAt: null,
        holdStartAt: null,
        buyCount: 0,
        sellCount: 0,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: walletHoldings.walletAddress,
        set: {
          currentBalance: balance.toString(),
          updatedAt: new Date(),
        },
      });
  }

  // Get all tracked wallet addresses
  async getAllTrackedWallets(): Promise<string[]> {
    const results = await db.select({ walletAddress: walletHoldings.walletAddress }).from(walletHoldings);
    return results.map(r => r.walletAddress);
  }

  async updateWalletHoldingOnSell(walletAddress: string, soldAmount: number, sellTime: Date): Promise<void> {
    await db
      .update(walletHoldings)
      .set({
        currentBalance: sql`GREATEST(0, CAST(${walletHoldings.currentBalance} AS NUMERIC) - ${soldAmount})`,
        totalSold: sql`CAST(${walletHoldings.totalSold} AS NUMERIC) + ${soldAmount}`,
        sellCount: sql`${walletHoldings.sellCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(walletHoldings.walletAddress, walletAddress));
  }

  async getDiamondHandsLeaderboard(limit: number = 20): Promise<DiamondHandsEntry[]> {
    // Get founder wallets to exclude from leaderboard
    const excludedWallets = await this.getFounderWalletsToExcludeFromLeaderboard();
    
    // LEFT JOIN with users to get usernames for linked wallets
    const whereConditions = [gt(sql`CAST(${walletHoldings.currentBalance} AS NUMERIC)`, 0)];
    if (excludedWallets.length > 0) {
      whereConditions.push(notInArray(walletHoldings.walletAddress, excludedWallets));
    }
    
    const results = await db
      .select({
        walletAddress: walletHoldings.walletAddress,
        userId: walletHoldings.userId,
        username: users.username,
        currentBalance: walletHoldings.currentBalance,
        holdStartAt: walletHoldings.holdStartAt,
        firstBuyAt: walletHoldings.firstBuyAt,
      })
      .from(walletHoldings)
      .leftJoin(users, eq(walletHoldings.userId, users.id))
      .where(and(...whereConditions))
      .orderBy(asc(walletHoldings.holdStartAt))
      .limit(limit);

    const now = Date.now();
    return results.map((row, index) => ({
      rank: index + 1,
      walletAddress: row.walletAddress,
      userId: row.userId,
      username: row.username || null,
      currentBalance: parseFloat(row.currentBalance) || 0,
      holdDurationSeconds: row.holdStartAt ? Math.floor((now - row.holdStartAt.getTime()) / 1000) : 0,
      firstBuyAt: row.firstBuyAt?.toISOString() || null,
      solscanUrl: `https://solscan.io/account/${row.walletAddress}`,
    }));
  }

  async getWhalesLeaderboard(limit: number = 20): Promise<WhaleEntry[]> {
    // Get founder wallets to exclude from leaderboard
    const excludedWallets = await this.getFounderWalletsToExcludeFromLeaderboard();
    
    // LEFT JOIN with users to get usernames for linked wallets
    const whereConditions = [gt(sql`CAST(${walletHoldings.currentBalance} AS NUMERIC)`, 0)];
    if (excludedWallets.length > 0) {
      whereConditions.push(notInArray(walletHoldings.walletAddress, excludedWallets));
    }
    
    const results = await db
      .select({
        walletAddress: walletHoldings.walletAddress,
        userId: walletHoldings.userId,
        username: users.username,
        currentBalance: walletHoldings.currentBalance,
        holdStartAt: walletHoldings.holdStartAt,
        firstBuyAt: walletHoldings.firstBuyAt,
      })
      .from(walletHoldings)
      .leftJoin(users, eq(walletHoldings.userId, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(sql`CAST(${walletHoldings.currentBalance} AS NUMERIC)`))
      .limit(limit);

    const now = Date.now();
    return results.map((row, index) => ({
      rank: index + 1,
      walletAddress: row.walletAddress,
      userId: row.userId,
      username: row.username || null,
      currentBalance: parseFloat(row.currentBalance) || 0,
      holdDurationSeconds: row.holdStartAt ? Math.floor((now - row.holdStartAt.getTime()) / 1000) : 0,
      firstBuyAt: row.firstBuyAt?.toISOString() || null,
      solscanUrl: `https://solscan.io/account/${row.walletAddress}`,
    }));
  }

  async getWalletHolding(walletAddress: string): Promise<WalletHolding | undefined> {
    const [holding] = await db.select().from(walletHoldings).where(eq(walletHoldings.walletAddress, walletAddress));
    return holding;
  }

  async getWalletBuyCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(walletBuys);
    return Number(result?.count || 0);
  }

  async getWalletHoldingsCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(walletHoldings);
    return Number(result?.count || 0);
  }

  async linkWalletHoldingToUser(walletAddress: string, userId: string): Promise<void> {
    // Update any existing wallet holdings to link to this user
    await db
      .update(walletHoldings)
      .set({
        userId,
        updatedAt: new Date(),
      })
      .where(eq(walletHoldings.walletAddress, walletAddress));
    
    console.log(`[Storage] Linked wallet holdings for ${walletAddress.slice(0, 8)}... to user ${userId}`);
  }

  // Backfill all wallet holdings with user IDs based on matching wallet addresses in users table
  async backfillWalletHoldingsUserIds(): Promise<number> {
    // Find all users with wallet addresses
    const usersWithWallets = await db
      .select({ id: users.id, walletAddress: users.walletAddress })
      .from(users)
      .where(sql`${users.walletAddress} IS NOT NULL`);
    
    let linkedCount = 0;
    for (const user of usersWithWallets) {
      if (user.walletAddress) {
        const result = await db
          .update(walletHoldings)
          .set({
            userId: user.id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(walletHoldings.walletAddress, user.walletAddress),
              sql`${walletHoldings.userId} IS NULL`
            )
          )
          .returning();
        
        if (result.length > 0) {
          linkedCount++;
          console.log(`[Storage] Backfilled wallet ${user.walletAddress.slice(0, 8)}... to user ${user.id}`);
        }
      }
    }
    
    console.log(`[Storage] Backfill complete: ${linkedCount} wallet holdings linked to users`);
    return linkedCount;
  }

  async unlinkWalletHoldingFromUser(walletAddress: string): Promise<void> {
    await db
      .update(walletHoldings)
      .set({
        userId: null,
        updatedAt: new Date(),
      })
      .where(eq(walletHoldings.walletAddress, walletAddress));
    
    console.log(`[Storage] Unlinked wallet holdings for ${walletAddress.slice(0, 8)}...`);
  }

  async getWalletHoldings(walletAddress: string): Promise<WalletHolding | undefined> {
    return this.getWalletHolding(walletAddress);
  }

  // Founder Wallet Management
  async getFounderWallets(userId: string): Promise<FounderWallet[]> {
    return await db
      .select()
      .from(founderWallets)
      .where(eq(founderWallets.userId, userId))
      .orderBy(desc(founderWallets.createdAt));
  }

  async getFounderWallet(id: string): Promise<FounderWallet | undefined> {
    const [wallet] = await db.select().from(founderWallets).where(eq(founderWallets.id, id));
    return wallet;
  }

  async getFounderWalletByAddress(walletAddress: string): Promise<FounderWallet | undefined> {
    const [wallet] = await db.select().from(founderWallets).where(eq(founderWallets.walletAddress, walletAddress));
    return wallet;
  }

  async createFounderWallet(wallet: InsertFounderWallet): Promise<FounderWallet> {
    const [created] = await db.insert(founderWallets).values(wallet).returning();
    return created;
  }

  async updateFounderWallet(id: string, data: Partial<InsertFounderWallet>): Promise<FounderWallet | undefined> {
    const [updated] = await db
      .update(founderWallets)
      .set({ ...data, lastUpdated: new Date() })
      .where(eq(founderWallets.id, id))
      .returning();
    return updated;
  }

  async deleteFounderWallet(id: string): Promise<void> {
    await db.delete(founderWallets).where(eq(founderWallets.id, id));
  }

  async getAllFounderWalletAddresses(): Promise<string[]> {
    const wallets = await db
      .select({ walletAddress: founderWallets.walletAddress })
      .from(founderWallets)
      .where(eq(founderWallets.isActive, true));
    return wallets.map(w => w.walletAddress);
  }

  async getFounderWalletsToExcludeFromLeaderboard(): Promise<string[]> {
    const wallets = await db
      .select({ walletAddress: founderWallets.walletAddress })
      .from(founderWallets)
      .where(and(
        eq(founderWallets.isActive, true),
        eq(founderWallets.showOnLeaderboard, false)
      ));
    return wallets.map(w => w.walletAddress);
  }

  // Friendships
  async sendFriendRequest(requesterId: string, addresseeId: string): Promise<Friendship> {
    const [created] = await db
      .insert(friendships)
      .values({
        requesterId,
        addresseeId,
        status: "pending",
      })
      .returning();
    return created;
  }

  async getFriendRequest(id: string): Promise<Friendship | undefined> {
    const [friendship] = await db
      .select()
      .from(friendships)
      .where(eq(friendships.id, id));
    return friendship;
  }

  async getFriendshipBetweenUsers(userId1: string, userId2: string): Promise<Friendship | undefined> {
    const [friendship] = await db
      .select()
      .from(friendships)
      .where(
        or(
          and(eq(friendships.requesterId, userId1), eq(friendships.addresseeId, userId2)),
          and(eq(friendships.requesterId, userId2), eq(friendships.addresseeId, userId1))
        )
      );
    return friendship;
  }

  async getPendingFriendRequests(userId: string): Promise<PendingFriendRequest[]> {
    const pendingRequests = await db
      .select()
      .from(friendships)
      .where(and(eq(friendships.addresseeId, userId), eq(friendships.status, "pending")))
      .orderBy(desc(friendships.createdAt));

    if (pendingRequests.length === 0) {
      return [];
    }

    const requesterIds = pendingRequests.map(r => r.requesterId);
    const requesters = await db
      .select()
      .from(users)
      .where(sql`${users.id} IN (${sql.join(requesterIds.map(id => sql`${id}`), sql`, `)})`);

    const requesterMap = new Map(requesters.map(u => [u.id, u]));

    return pendingRequests.map(request => {
      const requester = requesterMap.get(request.requesterId);
      return {
        id: request.id,
        requesterId: request.requesterId,
        addresseeId: request.addresseeId,
        status: request.status,
        createdAt: request.createdAt?.toISOString() || new Date().toISOString(),
        requester: {
          id: requester?.id || request.requesterId,
          username: requester?.username || "Unknown",
          avatarUrl: requester?.avatarUrl || null,
        },
      };
    });
  }

  async getSentFriendRequests(userId: string): Promise<Friendship[]> {
    return await db
      .select()
      .from(friendships)
      .where(and(eq(friendships.requesterId, userId), eq(friendships.status, "pending")))
      .orderBy(desc(friendships.createdAt));
  }

  async getFriends(userId: string): Promise<FriendWithDetails[]> {
    const acceptedFriendships = await db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.status, "accepted"),
          or(
            eq(friendships.requesterId, userId),
            eq(friendships.addresseeId, userId)
          )
        )
      );

    if (acceptedFriendships.length === 0) {
      return [];
    }

    const friendshipMap = new Map(
      acceptedFriendships.map((f) => [
        f.requesterId === userId ? f.addresseeId : f.requesterId,
        f.id,
      ])
    );

    const friendIds = Array.from(friendshipMap.keys());

    const friends = await db
      .select()
      .from(users)
      .where(sql`${users.id} IN (${sql.join(friendIds.map(id => sql`${id}`), sql`, `)})`);

    return friends.map((friend) => ({
      id: friend.id,
      friendshipId: friendshipMap.get(friend.id) || "",
      username: friend.username,
      avatarUrl: friend.avatarUrl,
    }));
  }

  async acceptFriendRequest(friendshipId: string): Promise<Friendship | undefined> {
    const [updated] = await db
      .update(friendships)
      .set({
        status: "accepted",
        respondedAt: new Date(),
      })
      .where(eq(friendships.id, friendshipId))
      .returning();
    return updated;
  }

  async declineFriendRequest(friendshipId: string): Promise<Friendship | undefined> {
    const [updated] = await db
      .update(friendships)
      .set({
        status: "declined",
        respondedAt: new Date(),
      })
      .where(eq(friendships.id, friendshipId))
      .returning();
    return updated;
  }

  async cancelFriendRequest(friendshipId: string): Promise<void> {
    await db.delete(friendships).where(eq(friendships.id, friendshipId));
  }

  async unfriend(friendshipId: string): Promise<void> {
    await db.delete(friendships).where(eq(friendships.id, friendshipId));
  }

  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const [friendship] = await db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.status, "accepted"),
          or(
            and(eq(friendships.requesterId, userId1), eq(friendships.addresseeId, userId2)),
            and(eq(friendships.requesterId, userId2), eq(friendships.addresseeId, userId1))
          )
        )
      );
    return !!friendship;
  }

  // Private Conversations
  async createConversation(participant1Id: string, participant2Id: string): Promise<PrivateConversation> {
    const existing = await this.getConversationBetweenUsers(participant1Id, participant2Id);
    if (existing) {
      return existing;
    }
    const [created] = await db.insert(privateConversations).values({
      participant1Id,
      participant2Id,
      isActive: true,
    }).returning();
    return created;
  }

  async getConversation(id: string): Promise<PrivateConversation | undefined> {
    const [conversation] = await db.select().from(privateConversations).where(eq(privateConversations.id, id));
    return conversation;
  }

  async getConversationBetweenUsers(userId1: string, userId2: string): Promise<PrivateConversation | undefined> {
    const [conversation] = await db
      .select()
      .from(privateConversations)
      .where(
        or(
          and(
            eq(privateConversations.participant1Id, userId1),
            eq(privateConversations.participant2Id, userId2)
          ),
          and(
            eq(privateConversations.participant1Id, userId2),
            eq(privateConversations.participant2Id, userId1)
          )
        )
      );
    return conversation;
  }

  async getUserConversations(userId: string): Promise<PrivateConversation[]> {
    return await db
      .select()
      .from(privateConversations)
      .where(
        and(
          eq(privateConversations.isActive, true),
          or(
            eq(privateConversations.participant1Id, userId),
            eq(privateConversations.participant2Id, userId)
          )
        )
      )
      .orderBy(desc(privateConversations.lastMessageAt));
  }

  async updateConversationLastMessage(conversationId: string): Promise<void> {
    await db
      .update(privateConversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(privateConversations.id, conversationId));
  }

  // Private Messages
  async createPrivateMessage(message: InsertPrivateMessage): Promise<PrivateMessage> {
    const [created] = await db.insert(privateMessages).values(message).returning();
    await this.updateConversationLastMessage(message.conversationId);
    return created;
  }

  async getPrivateMessages(conversationId: string, limit: number = 50, before?: Date): Promise<PrivateMessage[]> {
    const conditions = [eq(privateMessages.conversationId, conversationId), eq(privateMessages.isDeleted, false)];
    if (before) {
      conditions.push(sql`${privateMessages.createdAt} < ${before}`);
    }
    return await db
      .select()
      .from(privateMessages)
      .where(and(...conditions))
      .orderBy(desc(privateMessages.createdAt))
      .limit(limit);
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    await db
      .update(privateMessages)
      .set({ isRead: true })
      .where(
        and(
          eq(privateMessages.conversationId, conversationId),
          sql`${privateMessages.senderId} != ${userId}`,
          eq(privateMessages.isRead, false)
        )
      );
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(privateMessages)
      .innerJoin(
        privateConversations,
        eq(privateMessages.conversationId, privateConversations.id)
      )
      .where(
        and(
          eq(privateMessages.isRead, false),
          eq(privateMessages.isDeleted, false),
          sql`${privateMessages.senderId} != ${userId}`,
          or(
            eq(privateConversations.participant1Id, userId),
            eq(privateConversations.participant2Id, userId)
          )
        )
      );
    return result[0]?.count || 0;
  }

  async deletePrivateMessage(messageId: string): Promise<void> {
    await db
      .update(privateMessages)
      .set({ isDeleted: true })
      .where(eq(privateMessages.id, messageId));
  }

  // Encryption Keys
  async getUserEncryptionKey(userId: string): Promise<UserEncryptionKey | undefined> {
    const [key] = await db
      .select()
      .from(userEncryptionKeys)
      .where(eq(userEncryptionKeys.userId, userId));
    return key;
  }

  async setUserEncryptionKey(userId: string, publicKey: string): Promise<UserEncryptionKey> {
    const [result] = await db
      .insert(userEncryptionKeys)
      .values({
        userId,
        publicKey,
        keyVersion: 1,
      })
      .onConflictDoUpdate({
        target: userEncryptionKeys.userId,
        set: {
          publicKey,
          keyVersion: sql`${userEncryptionKeys.keyVersion} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // User Reports
  async createReport(report: InsertUserReport): Promise<UserReport> {
    const [created] = await db
      .insert(userReports)
      .values({ ...report, status: "pending" })
      .returning();
    return created;
  }

  async getReport(id: string): Promise<UserReport | undefined> {
    const [report] = await db
      .select()
      .from(userReports)
      .where(eq(userReports.id, id));
    return report;
  }

  async getReportsByStatus(status: string, limit: number = 50): Promise<UserReport[]> {
    return await db
      .select()
      .from(userReports)
      .where(eq(userReports.status, status))
      .orderBy(desc(userReports.createdAt))
      .limit(limit);
  }

  async getReportsByUser(reporterId: string): Promise<UserReport[]> {
    return await db
      .select()
      .from(userReports)
      .where(eq(userReports.reporterId, reporterId))
      .orderBy(desc(userReports.createdAt));
  }

  async getReportsAgainstUser(reportedUserId: string): Promise<UserReport[]> {
    return await db
      .select()
      .from(userReports)
      .where(eq(userReports.reportedUserId, reportedUserId))
      .orderBy(desc(userReports.createdAt));
  }

  async resolveReport(reportId: string, resolution: string, resolvedBy: string): Promise<UserReport | undefined> {
    const [updated] = await db
      .update(userReports)
      .set({
        status: "resolved",
        resolution,
        resolvedBy,
        resolvedAt: new Date(),
      })
      .where(eq(userReports.id, reportId))
      .returning();
    return updated;
  }

  async dismissReport(reportId: string, resolvedBy: string): Promise<UserReport | undefined> {
    const [updated] = await db
      .update(userReports)
      .set({
        status: "dismissed",
        resolvedBy,
        resolvedAt: new Date(),
      })
      .where(eq(userReports.id, reportId))
      .returning();
    return updated;
  }

  async countPendingReports(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(userReports)
      .where(eq(userReports.status, "pending"));
    return result?.count || 0;
  }

  async getPendingReportByReporterAndTarget(reporterId: string, reportedUserId: string): Promise<UserReport | undefined> {
    const [report] = await db
      .select()
      .from(userReports)
      .where(
        and(
          eq(userReports.reporterId, reporterId),
          eq(userReports.reportedUserId, reportedUserId),
          eq(userReports.status, "pending")
        )
      );
    return report;
  }

  // User Blocks
  async blockUser(blockerId: string, blockedId: string, reason?: string): Promise<UserBlock> {
    const [created] = await db
      .insert(userBlocks)
      .values({ blockerId, blockedId, reason })
      .returning();
    return created;
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await db
      .delete(userBlocks)
      .where(
        and(
          eq(userBlocks.blockerId, blockerId),
          eq(userBlocks.blockedId, blockedId)
        )
      );
  }

  async getBlockedUsers(blockerId: string): Promise<UserBlock[]> {
    return await db
      .select()
      .from(userBlocks)
      .where(eq(userBlocks.blockerId, blockerId))
      .orderBy(desc(userBlocks.createdAt));
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const [block] = await db
      .select()
      .from(userBlocks)
      .where(
        and(
          eq(userBlocks.blockerId, blockerId),
          eq(userBlocks.blockedId, blockedId)
        )
      );
    return !!block;
  }

  async isBlockedEitherWay(userId1: string, userId2: string): Promise<boolean> {
    const [block] = await db
      .select()
      .from(userBlocks)
      .where(
        or(
          and(eq(userBlocks.blockerId, userId1), eq(userBlocks.blockedId, userId2)),
          and(eq(userBlocks.blockerId, userId2), eq(userBlocks.blockedId, userId1))
        )
      );
    return !!block;
  }
}

export const storage = new DatabaseStorage();
