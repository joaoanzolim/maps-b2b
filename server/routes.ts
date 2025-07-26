import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { updateUserSchema, loginSchema, createUserSchema } from "@shared/schema";
import { z } from "zod";

// Authentication middleware
const isAuthenticated = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  next();
};

// Admin middleware
const isAdmin = async (req: any, res: any, next: any) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Acesso de administrador necessário" });
    }
    
    req.adminUser = req.user;
    next();
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ message: "Falha ao verificar status de administrador" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupAuth(app);

  // Get current user route
  app.get('/api/user', isAuthenticated, (req: any, res) => {
    res.json({ ...req.user, password: undefined });
  });

  // Update user profile (own profile)
  app.put('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const { firstName, lastName } = req.body;
      
      if (!firstName || !lastName) {
        return res.status(400).json({ message: "Nome e sobrenome são obrigatórios" });
      }
      
      const user = await storage.updateUser(req.user.id, { firstName, lastName });
      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Falha ao atualizar perfil" });
    }
  });

  // Update user password (own password)
  app.put('/api/user/password', isAuthenticated, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Senha atual e nova senha são obrigatórias" });
      }
      
      // Verify current password
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      const { comparePasswords } = await import('./auth');
      const isValidPassword = await comparePasswords(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Senha atual incorreta" });
      }
      
      // Hash new password and update
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(req.user.id, hashedPassword);
      
      res.json({ message: "Senha atualizada com sucesso" });
    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({ message: "Falha ao alterar senha" });
    }
  });

  // User creation route (admin only)
  app.post("/api/users", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userData = createUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email já cadastrado" });
      }

      const hashedPassword = await hashPassword(userData.password);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      res.status(201).json({ ...user, password: undefined });
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Falha ao criar usuário" });
      }
    }
  });

  // User management routes (admin only)
  app.get("/api/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await storage.getRegularUsers();
      const sanitizedUsers = users.map(user => ({ ...user, password: undefined }));
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Falha ao buscar usuários" });
    }
  });

  app.get("/api/users/stats", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const stats = await storage.getUserStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Falha ao buscar estatísticas" });
    }
  });

  app.put("/api/users/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userData = updateUserSchema.parse(req.body);
      
      const user = await storage.updateUser(id, userData);
      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error("Error updating user:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        res.status(500).json({ message: "Falha ao atualizar usuário" });
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
      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error("Error updating user credits:", error);
      res.status(500).json({ message: "Falha ao atualizar créditos do usuário" });
    }
  });

  app.patch("/api/users/:id/credit-limit", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { limit } = req.body;
      
      if (typeof limit !== "number" || limit < 0) {
        return res.status(400).json({ message: "Limite de créditos deve ser um número não negativo" });
      }
      
      const user = await storage.updateUserCreditLimit(id, limit);
      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error("Error updating credit limit:", error);
      res.status(500).json({ message: "Falha ao atualizar limite de créditos" });
    }
  });

  app.get("/api/users/:id/credit-transactions", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const transactions = await storage.getCreditTransactions(id);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching credit transactions:", error);
      res.status(500).json({ message: "Falha ao buscar transações de créditos" });
    }
  });

  // User status management routes (admin only)
  app.post("/api/users/:id/block", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.blockUser(id);
      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error("Error blocking user:", error);
      res.status(500).json({ message: "Falha ao bloquear usuário" });
    }
  });

  app.post("/api/users/:id/unblock", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const user = await storage.unblockUser(id);
      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error("Error unblocking user:", error);
      res.status(500).json({ message: "Falha ao desbloquear usuário" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
