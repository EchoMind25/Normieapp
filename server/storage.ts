import { db } from "./db";
import { eq, and, gt, desc, sql } from "drizzle-orm";
import {
  users,
  sessions,
  passwordResetTokens,
  authChallenges,
  icons,
  nfts,
  nftTransactions,
  chatRooms,
  chatMessages,
  chatRoomMembers,
  polls,
  pollOptions,
  pollVotes,
  activityItems,
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
  type Nft,
  type InsertNft,
  type NftTransaction,
  type InsertNftTransaction,
  type ChatRoom,
  type InsertChatRoom,
  type ChatMessage,
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
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByWallet(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  banUser(id: string): Promise<void>;
  unbanUser(id: string): Promise<void>;
  
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
  createIcon(icon: InsertIcon): Promise<Icon>;
  
  // NFTs
  createNft(nft: InsertNft): Promise<Nft>;
  getNft(id: string): Promise<Nft | undefined>;
  getNftsByOwner(ownerId: string): Promise<Nft[]>;
  getListedNfts(): Promise<Nft[]>;
  updateNft(id: string, data: Partial<InsertNft>): Promise<Nft | undefined>;
  
  // NFT Transactions
  createNftTransaction(tx: InsertNftTransaction): Promise<NftTransaction>;
  
  // Chat Rooms
  createChatRoom(room: InsertChatRoom): Promise<ChatRoom>;
  getChatRoom(id: string): Promise<ChatRoom | undefined>;
  getPublicChatRooms(): Promise<ChatRoom[]>;
  
  // Chat Messages
  createChatMessage(msg: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(roomId: string, limit?: number): Promise<ChatMessage[]>;
  markMessageDeleted(id: string): Promise<void>;
  
  // Chat Room Members
  addChatRoomMember(member: InsertChatRoomMember): Promise<ChatRoomMember>;
  removeChatRoomMember(roomId: string, userId: string): Promise<void>;
  getChatRoomMembers(roomId: string): Promise<ChatRoomMember[]>;
  isRoomMember(roomId: string, userId: string): Promise<boolean>;
  
  // Polls
  getActivePolls(): Promise<Array<PollDb & { options: PollOption[] }>>;
  getPoll(id: string): Promise<(PollDb & { options: PollOption[] }) | undefined>;
  createPoll(poll: InsertPollDb, options: string[]): Promise<PollDb>;
  hasVoted(pollId: string, visitorId: string): Promise<boolean>;
  vote(pollId: string, optionId: string, visitorId: string): Promise<void>;
  
  // Activity Feed
  getRecentActivity(limit?: number): Promise<ActivityItemDb[]>;
  createActivityItem(item: InsertActivityItemDb): Promise<ActivityItemDb>;
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

  async banUser(id: string): Promise<void> {
    await db.update(users).set({ bannedAt: new Date() }).where(eq(users.id, id));
  }

  async unbanUser(id: string): Promise<void> {
    await db.update(users).set({ bannedAt: null }).where(eq(users.id, id));
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

  async createIcon(icon: InsertIcon): Promise<Icon> {
    const [created] = await db.insert(icons).values(icon).returning();
    return created;
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

  async getNftsByOwner(ownerId: string): Promise<Nft[]> {
    return db.select().from(nfts).where(eq(nfts.ownerId, ownerId));
  }

  async getListedNfts(): Promise<Nft[]> {
    return db.select().from(nfts).where(eq(nfts.status, "listed"));
  }

  async updateNft(id: string, data: Partial<InsertNft>): Promise<Nft | undefined> {
    const [updated] = await db
      .update(nfts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(nfts.id, id))
      .returning();
    return updated;
  }

  // NFT Transactions
  async createNftTransaction(tx: InsertNftTransaction): Promise<NftTransaction> {
    const [created] = await db.insert(nftTransactions).values(tx).returning();
    return created;
  }

  // Chat Rooms
  async createChatRoom(room: InsertChatRoom): Promise<ChatRoom> {
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

  async getChatMessages(roomId: string, limit: number = 50): Promise<ChatMessage[]> {
    return db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.roomId, roomId), eq(chatMessages.isDeleted, false)))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
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
}

export const storage = new DatabaseStorage();
