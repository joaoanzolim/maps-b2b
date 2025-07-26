import { hashPassword } from "./auth";
import { storage } from "./storage";

async function seedAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await storage.getUserByEmail("admin@sistema.com");
    if (existingAdmin) {
      console.log("Admin user already exists");
      return;
    }

    // Create admin user
    const hashedPassword = await hashPassword("admin123");
    const admin = await storage.createUser({
      email: "admin@sistema.com",
      password: hashedPassword,
      firstName: "Administrador",
      lastName: "Sistema",
      role: "admin",
    });

    console.log("Admin user created successfully:", admin.email);
  } catch (error) {
    console.error("Error creating admin user:", error);
  }
}

seedAdmin();