import {
  users,
  materials,
  machines,
  submissions,
  type User,
  type UpsertUser,
  type Material,
  type Machine,
  type Submission,
  type InsertMaterial,
  type InsertMachine,
  type InsertSubmission,
  type SubmissionWithDetails,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Material operations
  getMaterials(): Promise<Material[]>;
  getMaterial(id: number): Promise<Material | undefined>;
  getMaterialByName(name: string): Promise<Material | undefined>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterial(id: number, material: Partial<InsertMaterial>): Promise<Material>;
  
  // Machine operations
  getMachines(): Promise<Machine[]>;
  getMachine(id: number): Promise<Machine | undefined>;
  createMachine(machine: InsertMachine): Promise<Machine>;
  
  // Submission operations
  createSubmission(submission: InsertSubmission & { userId: string }): Promise<Submission>;
  getSubmission(id: number): Promise<SubmissionWithDetails | undefined>;
  getUserSubmissions(userId: string): Promise<SubmissionWithDetails[]>;
  getAllSubmissions(): Promise<SubmissionWithDetails[]>;
  updateSubmission(id: number, updates: Partial<Submission>): Promise<Submission>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: string, role: string): Promise<User>;
  deactivateUser(id: string): Promise<User>;
  
  // Statistics
  getStats(): Promise<{
    totalCustomers: number;
    totalServiceProviders: number;
    totalSubmissions: number;
    pendingSubmissions: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getMaterials(): Promise<Material[]> {
    return await db.select().from(materials).orderBy(materials.name);
  }

  async getMaterial(id: number): Promise<Material | undefined> {
    const [material] = await db.select().from(materials).where(eq(materials.id, id));
    return material;
  }

  async getMaterialByName(name: string): Promise<Material | undefined> {
    const [material] = await db.select().from(materials).where(eq(materials.name, name));
    return material;
  }

  async createMaterial(material: InsertMaterial): Promise<Material> {
    const [newMaterial] = await db.insert(materials).values(material).returning();
    return newMaterial;
  }

  async updateMaterial(id: number, material: Partial<InsertMaterial>): Promise<Material> {
    const [updatedMaterial] = await db
      .update(materials)
      .set(material)
      .where(eq(materials.id, id))
      .returning();
    return updatedMaterial;
  }

  async getMachines(): Promise<Machine[]> {
    return await db.select().from(machines).orderBy(machines.name);
  }

  async getMachine(id: number): Promise<Machine | undefined> {
    const [machine] = await db.select().from(machines).where(eq(machines.id, id));
    return machine;
  }

  async createMachine(machine: InsertMachine): Promise<Machine> {
    const [newMachine] = await db.insert(machines).values(machine).returning();
    return newMachine;
  }

  async createSubmission(submission: InsertSubmission & { userId: string }): Promise<Submission> {
    const [newSubmission] = await db.insert(submissions).values(submission).returning();
    return newSubmission;
  }

  async getSubmission(id: number): Promise<SubmissionWithDetails | undefined> {
    const [submission] = await db
      .select()
      .from(submissions)
      .leftJoin(users, eq(submissions.userId, users.id))
      .leftJoin(materials, eq(submissions.materialId, materials.id))
      .leftJoin(machines, eq(submissions.recommendedMachineId, machines.id))
      .where(eq(submissions.id, id));

    if (!submission) return undefined;

    return {
      ...submission.submissions,
      user: submission.users!,
      material: submission.materials,
      recommendedMachine: submission.machines,
    };
  }

  async getUserSubmissions(userId: string): Promise<SubmissionWithDetails[]> {
    const results = await db
      .select()
      .from(submissions)
      .leftJoin(users, eq(submissions.userId, users.id))
      .leftJoin(materials, eq(submissions.materialId, materials.id))
      .leftJoin(machines, eq(submissions.recommendedMachineId, machines.id))
      .where(eq(submissions.userId, userId))
      .orderBy(desc(submissions.createdAt));

    return results.map(result => ({
      ...result.submissions,
      user: result.users!,
      material: result.materials,
      recommendedMachine: result.machines,
    }));
  }

  async getAllSubmissions(): Promise<SubmissionWithDetails[]> {
    const results = await db
      .select()
      .from(submissions)
      .leftJoin(users, eq(submissions.userId, users.id))
      .leftJoin(materials, eq(submissions.materialId, materials.id))
      .leftJoin(machines, eq(submissions.recommendedMachineId, machines.id))
      .orderBy(desc(submissions.createdAt));

    return results.map(result => ({
      ...result.submissions,
      user: result.users!,
      material: result.materials,
      recommendedMachine: result.machines,
    }));
  }

  async updateSubmission(id: number, updates: Partial<Submission>): Promise<Submission> {
    const [updatedSubmission] = await db
      .update(submissions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(submissions.id, id))
      .returning();
    return updatedSubmission;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deactivateUser(id: string): Promise<User> {
    const [deactivatedUser] = await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return deactivatedUser;
  }

  async getStats(): Promise<{
    totalCustomers: number;
    totalServiceProviders: number;
    totalSubmissions: number;
    pendingSubmissions: number;
  }> {
    const [customerCount] = await db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.role, "customer"), eq(users.isActive, true)));

    const [serviceProviderCount] = await db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.role, "service-provider"), eq(users.isActive, true)));

    const [submissionCount] = await db
      .select({ count: count() })
      .from(submissions);

    const [pendingCount] = await db
      .select({ count: count() })
      .from(submissions)
      .where(eq(submissions.status, "pending"));

    return {
      totalCustomers: customerCount.count,
      totalServiceProviders: serviceProviderCount.count,
      totalSubmissions: submissionCount.count,
      pendingSubmissions: pendingCount.count,
    };
  }
}

export const storage = new DatabaseStorage();
