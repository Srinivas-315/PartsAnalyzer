import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertSubmissionSchema,
  insertMaterialSchema,
  insertMachineSchema,
} from "@shared/schema";
import { calculateAMFeasibility } from "../client/src/lib/calculations";
import multer from "multer";
import { z } from "zod";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);
  await initializeDefaultData();

  // Auth: Get current user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Materials
  app.get("/api/materials", isAuthenticated, async (_req, res) => {
    try {
      const materials = await storage.getMaterials();
      res.json(materials);
    } catch (error) {
      console.error("Error fetching materials:", error);
      res.status(500).json({ message: "Failed to fetch materials" });
    }
  });

  app.post("/api/materials", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const materialData = insertMaterialSchema.parse(req.body);
      const material = await storage.createMaterial(materialData);
      res.json(material);
    } catch (error) {
      console.error("Error creating material:", error);
      res.status(500).json({ message: "Failed to create material" });
    }
  });

  // Machines
  app.get("/api/machines", isAuthenticated, async (_req, res) => {
    try {
      const machines = await storage.getMachines();
      res.json(machines);
    } catch (error) {
      console.error("Error fetching machines:", error);
      res.status(500).json({ message: "Failed to fetch machines" });
    }
  });

  // Submissions (Single)
  app.post("/api/submissions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const submissionData = insertSubmissionSchema.parse(req.body);
      const submission = await storage.createSubmission({ ...submissionData, userId });

      try {
        const analysis = await calculateAMFeasibility(submission, storage);
        const updatedSubmission = await storage.updateSubmission(submission.id, {
          ...analysis,
          status: "completed",
        });
        res.json(updatedSubmission);
      } catch (calcError) {
        console.error("Calculation error:", calcError);
        await storage.updateSubmission(submission.id, { status: "error" });
        res.status(500).json({ message: "We would like to take some time to work on your request" });
      }
    } catch (error) {
      console.error("Error creating submission:", error);
      res.status(500).json({ message: "Failed to create submission" });
    }
  });

  // Submissions (Bulk)
  app.post("/api/submissions/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const submissionsData = z.array(insertSubmissionSchema).parse(req.body);
      const results = [];

      for (const submissionData of submissionsData) {
        try {
          const submission = await storage.createSubmission({ ...submissionData, userId });
          const analysis = await calculateAMFeasibility(submission, storage);
          const updated = await storage.updateSubmission(submission.id, { ...analysis, status: "completed" });
          results.push(updated);
        } catch (error) {
          console.error(`Error processing submission ${submissionData.partNumber}:`, error);
          results.push({ partNumber: submissionData.partNumber, error: "Failed to process submission" });
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error creating bulk submissions:", error);
      res.status(500).json({ message: "Failed to create bulk submissions" });
    }
  });

  // Submissions list
  app.get("/api/submissions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const user = await storage.getUser(userId);

      const submissions =
        user?.role === "admin" || user?.role === "service-provider"
          ? await storage.getAllSubmissions()
          : await storage.getUserSubmissions(userId);

      res.json(submissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  // Submission details
  app.get("/api/submissions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.session.user.id;
      const user = await storage.getUser(userId);
      const submission = await storage.getSubmission(id);

      if (!submission) return res.status(404).json({ message: "Submission not found" });
      if (user?.role !== "admin" && user?.role !== "service-provider" && submission.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      res.json(submission);
    } catch (error) {
      console.error("Error fetching submission:", error);
      res.status(500).json({ message: "Failed to fetch submission" });
    }
  });

  // Admin - Users
  app.get("/api/admin/users", isAuthenticated, async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id/role", isAuthenticated, async (req: any, res) => {
    try {
      const { role } = req.body;
      const updatedUser = await storage.updateUserRole(req.params.id, role);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch("/api/admin/users/:id/deactivate", isAuthenticated, async (req: any, res) => {
    try {
      const deactivatedUser = await storage.deactivateUser(req.params.id);
      res.json(deactivatedUser);
    } catch (error) {
      console.error("Error deactivating user:", error);
      res.status(500).json({ message: "Failed to deactivate user" });
    }
  });

  app.get("/api/admin/stats", isAuthenticated, async (_req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  return createServer(app);
}

// Seed default materials and machines if not present
async function initializeDefaultData() {
  try {
    const materials = await storage.getMaterials();
    if (materials.length === 0) {
      const defaultMaterials = [
        { name: "17-4PH", pricePerGram: 200, stressRelievingHours: 6, surface: 20, performance: 40, speed: 40, density: 0.0078, materialFeasibilityScore: 3, scanSpeed: 1200, contourSpeed: 350, hatchDist: 140, isCustom: false },
        { name: "ALSI10MG", pricePerGram: 300, stressRelievingHours: 8, surface: 30, performance: 30, speed: 30, density: 0.00265, materialFeasibilityScore: 3, scanSpeed: 960, contourSpeed: 1100, hatchDist: 110, isCustom: false },
        { name: "IN625", pricePerGram: 240, stressRelievingHours: 3, surface: 20, performance: 40, speed: 50, density: 0.00844, materialFeasibilityScore: 3, scanSpeed: 1300, contourSpeed: 1800, hatchDist: 190, isCustom: false },
        { name: "IN718", pricePerGram: 340, stressRelievingHours: 5, surface: 20, performance: 40, speed: 50, density: 0.0082, materialFeasibilityScore: 3, scanSpeed: 1300, contourSpeed: 950, hatchDist: 130, isCustom: false },
        { name: "MS", pricePerGram: 260, stressRelievingHours: 2, surface: 20, performance: 40, speed: 50, density: 0.00785, materialFeasibilityScore: 3, scanSpeed: 928, contourSpeed: 1246.9, hatchDist: 90, isCustom: false },
        { name: "SS316L", pricePerGram: 360, stressRelievingHours: 5, surface: 20, performance: 40, speed: 50, density: 0.00798, materialFeasibilityScore: 3, scanSpeed: 1010, contourSpeed: 300, hatchDist: 110, isCustom: false },
        { name: "TI64", pricePerGram: 700, stressRelievingHours: 6, surface: 30, performance: 30, speed: 60, density: 0.00443, materialFeasibilityScore: 3, scanSpeed: 1200, contourSpeed: 350, hatchDist: 140, isCustom: false },
      ];

      for (const material of defaultMaterials) {
        await storage.createMaterial(material);
      }
    }

    const machines = await storage.getMachines();
    if (machines.length === 0) {
      const defaultMachines = [
        { name: "EOS M2XX", machineX: 250, machineY: 250, machineZ: 315, mhr: 2000, recoaterTravel: 1040, dewelT: 1.5, recoaterUp: 500, recoaterRet: 150, avgSp: 325, averageCycleTime: 7.9 },
        { name: "EOS M400", machineX: 400, machineY: 400, machineZ: 400, mhr: 3000, recoaterTravel: 900, dewelT: 1.5, recoaterUp: 500, recoaterRet: 150, avgSp: 325, averageCycleTime: 7 },
      ];

      for (const machine of defaultMachines) {
        await storage.createMachine(machine);
      }
    }
  } catch (error) {
    console.error("Error initializing default data:", error);
  }
}
