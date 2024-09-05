import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { skill_yield as SkillYield } from "~/../db/schema";

// TS
export type SelectSkillYield = InferSelectModel<typeof SkillYield>;
export type InsertSkillYield = InferInsertModel<typeof SkillYield>;

// Zod
export const SelectSkillYieldSchema = createSelectSchema(SkillYield);
export const InsertSkillYieldSchema = createInsertSchema(SkillYield);

// default
export const defaultSelectSkillYield: SelectSkillYield = {
  id: "defaultSelectSkillYield",
  name: "defaultSelectSkillYield",
  yieldType: "ImmediateEffect",
  mutationTimingFormula: "",
  yieldFormula: "",
  skillEffectId: "defaultSelectSkillEffect",
};
export const defaultInsertSkillYield: InsertSkillYield = {
  id: "",
  name: "",
  yieldType: "ImmediateEffect",
  mutationTimingFormula: "",
  yieldFormula: "",
}