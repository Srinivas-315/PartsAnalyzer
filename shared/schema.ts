import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  real,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("customer"), // customer, service-provider, admin
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Materials table
export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  pricePerGram: real("price_per_gram").notNull(), // in rupees
  stressRelievingHours: real("stress_relieving_hours").notNull(),
  surface: real("surface").notNull(),
  performance: real("performance").notNull(),
  speed: real("speed").notNull(),
  density: real("density").notNull(), // g/cm³
  materialFeasibilityScore: integer("material_feasibility_score").notNull(),
  scanSpeed: real("scan_speed").notNull(),
  contourSpeed: real("contour_speed").notNull(),
  hatchDist: real("hatch_dist").notNull(),
  isCustom: boolean("is_custom").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Machines table
export const machines = pgTable("machines", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  machineX: real("machine_x").notNull(), // mm
  machineY: real("machine_y").notNull(), // mm
  machineZ: real("machine_z").notNull(), // mm
  mhr: real("mhr").notNull(), // machine hour rate
  recoaterTravel: real("recoater_travel").notNull(),
  dewelT: real("dewel_t").notNull(),
  recoaterUp: real("recoater_up").notNull(),
  recoaterRet: real("recoater_ret").notNull(),
  avgSp: real("avg_sp").notNull(),
  averageCycleTime: real("average_cycle_time").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Part submissions table
export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  serialNumber: varchar("serial_number").notNull(),
  partNumber: varchar("part_number").notNull(),
  partName: varchar("part_name").notNull(),
  materialId: integer("material_id").references(() => materials.id),
  customMaterial: varchar("custom_material"),
  productionCriteria: varchar("production_criteria").notNull(), // Surface, Performance, Speed
  boundingBoxX: real("bounding_box_x").notNull(), // mm
  boundingBoxY: real("bounding_box_y").notNull(), // mm
  boundingBoxZ: real("bounding_box_z").notNull(), // mm
  volume: real("volume").notNull(), // mm³
  surfaceArea: real("surface_area").notNull(), // mm²
  annualQuantity: integer("annual_quantity").notNull(),
  presentCost: real("present_cost").notNull(), // rupees
  expectedValueAddition: text("expected_value_addition").notNull(),
  painPointAddressed: text("pain_point_addressed").notNull(),
  status: varchar("status").notNull().default("pending"), // pending, processing, completed, error
  
  // Analysis Results
  technicalFitScore: real("technical_fit_score"),
  economicFitScore: real("economic_fit_score"),
  implementationTimeScore: real("implementation_time_score"),
  materialFeasibilityScore: real("material_feasibility_score"),
  sizeFeasibilityScore: real("size_feasibility_score"),
  designFeasibilityScore: real("design_feasibility_score"),
  
  // Cost Analysis
  materialCost: real("material_cost"),
  machineCost: real("machine_cost"),
  postProcessingCost: real("post_processing_cost"),
  totalAmCost: real("total_am_cost"),
  
  // Build Details
  recommendedMachineId: integer("recommended_machine_id").references(() => machines.id),
  buildHours: real("build_hours"),
  layerThickness: real("layer_thickness"),
  numberOfLayers: integer("number_of_layers"),
  sinteringTime: real("sintering_time"),
  contourTime: real("contour_time"),
  recoaterTime: real("recoater_time"),
  platformTime: real("platform_time"),
  imagingTime: real("imaging_time"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  submissions: many(submissions),
}));

export const materialsRelations = relations(materials, ({ many }) => ({
  submissions: many(submissions),
}));

export const machinesRelations = relations(machines, ({ many }) => ({
  submissions: many(submissions),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  user: one(users, {
    fields: [submissions.userId],
    references: [users.id],
  }),
  material: one(materials, {
    fields: [submissions.materialId],
    references: [materials.id],
  }),
  recommendedMachine: one(machines, {
    fields: [submissions.recommendedMachineId],
    references: [machines.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  role: true,
});

export const insertMaterialSchema = createInsertSchema(materials).omit({
  id: true,
  createdAt: true,
});

export const insertMachineSchema = createInsertSchema(machines).omit({
  id: true,
  createdAt: true,
});

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  technicalFitScore: true,
  economicFitScore: true,
  implementationTimeScore: true,
  materialFeasibilityScore: true,
  sizeFeasibilityScore: true,
  designFeasibilityScore: true,
  materialCost: true,
  machineCost: true,
  postProcessingCost: true,
  totalAmCost: true,
  recommendedMachineId: true,
  buildHours: true,
  layerThickness: true,
  numberOfLayers: true,
  sinteringTime: true,
  contourTime: true,
  recoaterTime: true,
  platformTime: true,
  imagingTime: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type Machine = typeof machines.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type InsertMachine = z.infer<typeof insertMachineSchema>;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;

// Extended types for API responses
export type SubmissionWithDetails = Submission & {
  user: User;
  material: Material | null;
  recommendedMachine: Machine | null;
};
