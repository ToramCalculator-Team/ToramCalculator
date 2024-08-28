import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { combo_step as ComboStep } from "../../drizzle/schema";

// TS
export type SelectComboStep = InferSelectModel<typeof ComboStep> & {

};
export type InsertComboStep = InferInsertModel<typeof ComboStep> & {
    
}

// Zod
export const SelectComboStepSchema = createSelectSchema(ComboStep);
export const InsertComboStepSchema = createInsertSchema(ComboStep);

// default
export const defaultSelectComboStep: SelectComboStep = {
    id: "",
    comboId: "",
    order: 0,
    comboType: "NULL",
    skillId: ""
}
