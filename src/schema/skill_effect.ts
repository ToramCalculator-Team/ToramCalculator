import { z } from "zod";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { skill_effect as SkillEffect } from "../../drizzle/schema";
import {
  defaultInsertSkillCost,
  defaultSelectSkillCost,
  InsertSkillCost,
  SelectSkillCost,
  SelectSkillCostSchema,
} from "./skill_cost";
import {
  defaultInsertSkillYield,
  defaultSelectSkillYield,
  InsertSkillYield,
  SelectSkillYield,
  SelectSkillYieldSchema,
} from "./skill_yield";

// TS
export type SelectSkillEffect = InferSelectModel<typeof SkillEffect> & {
  skillCost: SelectSkillCost[];
  skillYield: SelectSkillYield[];
};
export type InsertSkillEffect = InferInsertModel<typeof SkillEffect> & {
  skillCost: InsertSkillCost[];
  skillYield: InsertSkillYield[];
};

// Zod
export const SelectSkillEffectSchema = createSelectSchema(SkillEffect).extend({
  skillCost: z.array(SelectSkillCostSchema),
  skillYield: z.array(SelectSkillYieldSchema),
});
export const InsertSkillEffectSchema = createInsertSchema(SkillEffect).extend({
  skillCost: z.array(SelectSkillCostSchema),
  skillYield: z.array(SelectSkillYieldSchema),
});

// default
export const defaultSelectSkillEffect: SelectSkillEffect = {
  id: "",
  condition: "",
  description: "",
  actionBaseDurationFormula: "13",
  actionModifiableDurationFormula: "48",
  skillExtraActionType: "None",
  chargingBaseDurationFormula: "0",
  chargingModifiableDurationFormula: "0",
  chantingBaseDurationFormula: "0",
  chantingModifiableDurationFormula: "0",
  skillStartupFramesFormula: "0",
  skillCost: [defaultSelectSkillCost],
  skillYield: [defaultSelectSkillYield],
  belongToskillId: "",
};
export const defaultInsertSkillEffect: InsertSkillEffect = {
  id: "",
  condition: "",
  description: "",
  actionBaseDurationFormula: "13",
  actionModifiableDurationFormula: "48",
  skillExtraActionType: "None",
  chargingBaseDurationFormula: "0",
  chargingModifiableDurationFormula: "0",
  chantingBaseDurationFormula: "0",
  chantingModifiableDurationFormula: "0",
  skillStartupFramesFormula: "0",
  skillCost: [defaultInsertSkillCost],
  skillYield: [defaultInsertSkillYield],
  belongToskillId: "",
};
