import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { updateUserSchema, insertCreditTransactionSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Admin middleware
  const isAdmin = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      req.adminUser = user;
      next();
    } catch (error) {
      console.error("Error checking admin status:", error);
      res.status(500).json({ message: "Failed to verify admin status" });
    }
  };

  // User management routes (admin only)
  app.get("/api/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await storage.getRegularUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/stats", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const stats = await storage.getUserStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  app.patch("/api/users/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userData = updateUserSchema.parse(req.body);
      
      const user = await storage.updateUser(id, userData);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid user data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update user" });
      }
    }
  });

  // Credit management routes (admin only)
  app.post("/api/users/:id/credits", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { amount, note } = req.body;
      
      if (typeof amount !== "number") {
        return res.status(400).json({ message: "Amount must be a number" });
      }
      
      const adminId = req.adminUser.id;
      const user = await storage.updateUserCredits(id, amount, adminId, note);
      res.json(user);
    } catch (error) {
      console.error("Error updating user credits:", error);
      res.status(500).json({ message: "Failed to update user credits" });
    }
  });

  app.patch("/api/users/:id/credit-limit", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { limit } = req.body;
      
      if (typeof limit !== "number" || limit < 0) {
        return res.status(400).json({ message: "Credit limit must be a non-negative number" });
      }
      
      const user = await storage.updateUserCreditLimit(id, limit);
      res.json(user);
    } catch (error) {
      console.error("Error updating credit limit:", error);
      res.status(500).json({ message: "Failed to update credit limit" });
    }
  });

  app.get("/api/users/:id/credit-transactions", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const transactions = await storage.getCreditTransactions(id);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching credit transactions:", error);
      res.status(500).json({ message: "Failed to fetch credit transactions" });
    }
  });

  // User status management routes (admin only)
  app.post("/api/users/:id/block", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.blockUser(id);
      res.json(user);
    } catch (error) {
      console.error("Error blocking user:", error);
      res.status(500).json({ message: "Failed to block user" });
    }
  });

  app.post("/api/users/:id/unblock", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.unblockUser(id);
      res.json(user);
    } catch (error) {
      console.error("Error unblocking user:", error);
      res.status(500).json({ message: "Failed to unblock user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
