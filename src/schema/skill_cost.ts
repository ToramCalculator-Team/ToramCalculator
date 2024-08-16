import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { skill_cost as SkillCost } from "../../drizzle/schema";

// TS
export type SelectSkillCost = InferSelectModel<typeof SkillCost>;
export type InsertSkillCost = InferInsertModel<typeof SkillCost>;

// Zod
export const SelectSkillCostSchema = createSelectSchema(SkillCost);
export const InsertSkillCostSchema = createInsertSchema(SkillCost);

// default
export const defaultSelectSkillCost: SelectSkillCost = {
  id: "defaultSelectSkillCost",
  name: "defaultSelectSkillCost",
  costFormula: "",
  skillEffectId: "defaultSelectSkillEffect",
};
export const defaultInsertSkillCost: InsertSkillCost = {
  id: "defaultInsertSkillCost",
  name: "defaultInsertSkillCost",
  costFormula: "",
  skillEffectId: "defaultSelectSkillEffect",
}