import {
  users,
  creditTransactions,
  type User,
  type InsertUser,
  type UpdateUser,
  type CreateUserData,
  type CreditTransaction,
  type InsertCreditTransaction,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: CreateUserData): Promise<User>;
  
  // Additional user operations
  getAllUsers(): Promise<User[]>;
  getRegularUsers(): Promise<User[]>;
  updateUser(id: string, data: UpdateUser): Promise<User>;
  updateUserPassword(id: string, hashedPassword: string): Promise<void>;
  getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    blockedUsers: number;
    totalCredits: number;
  }>;
  
  // Credit operations
  updateUserCredits(userId: string, amount: number, adminId: string, note?: string): Promise<User>;
  updateUserCreditLimit(userId: string, limit: number): Promise<User>;
  getCreditTransactions(userId: string): Promise<CreditTransaction[]>;
  
  // User status operations
  blockUser(userId: string): Promise<User>;
  unblockUser(userId: string): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: CreateUserData): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  // Additional user operations
  
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getRegularUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, "regular")).orderBy(desc(users.createdAt));
  }

  async updateUser(id: string, data: UpdateUser): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    blockedUsers: number;
    totalCredits: number;
  }> {
    const [stats] = await db
      .select({
        totalUsers: count(),
        activeUsers: sql<number>`count(*) filter (where status = 'active')`,
        blockedUsers: sql<number>`count(*) filter (where status = 'blocked')`,
        totalCredits: sql<number>`sum(credits)`,
      })
      .from(users)
      .where(eq(users.role, "regular"));

    return {
      totalUsers: Number(stats.totalUsers),
      activeUsers: Number(stats.activeUsers),
      blockedUsers: Number(stats.blockedUsers),
      totalCredits: Number(stats.totalCredits) || 0,
    };
  }

  // Credit operations
  
  async updateUserCredits(userId: string, amount: number, adminId: string, note?: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const newBalance = Math.max(0, user.credits + amount);
    
    // Update user credits
    const [updatedUser] = await db
      .update(users)
      .set({ credits: newBalance, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    // Record transaction
    await db.insert(creditTransactions).values({
      userId,
      amount,
      previousBalance: user.credits,
      newBalance,
      note,
      adminId,
    });

    return updatedUser;
  }

  async updateUserCreditLimit(userId: string, limit: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ creditLimit: limit, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getCreditTransactions(userId: string): Promise<CreditTransaction[]> {
    return await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt));
  }

  // User status operations
  
  async blockUser(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ status: "blocked", updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async unblockUser(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
}

export const storage = new DatabaseStorage();
