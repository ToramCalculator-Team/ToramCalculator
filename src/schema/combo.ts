import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { combo as Combo } from "../../drizzle/schema";
import { SelectComboStep, InsertComboStep, SelectComboStepSchema, InsertComboStepSchema } from "./combo_step";

// TS 
export type SelectCombo = InferSelectModel<typeof Combo> & {
  comboStep: SelectComboStep[];
};
export type InsertCombo = InferInsertModel<typeof Combo> & {
  comboStep: InsertComboStep[];
}

// Zod
export const SelectComboSchema = createSelectSchema(Combo).extend({
  comboStep: SelectComboStepSchema.array(),
})
export const InsertComboSchema = createInsertSchema(Combo).extend({
  comboStep: InsertComboStepSchema.array(),
})

export const defaultSelectCombo: SelectCombo = {
  id: "",
  name: null,
  comboStep: [],
  userCreateUserId: "",
};
