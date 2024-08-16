import { modifier as Modifier } from "../../drizzle/schema";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// TS
export type SelectModifier = InferSelectModel<typeof Modifier>;
export type InsertModifier = InferInsertModel<typeof Modifier>;

// Zod
export const SelectModifierSchema = createSelectSchema(Modifier);
export const InsertModifierSchema = createInsertSchema(Modifier);

// default
export const defaultSelectModifier: SelectModifier = {
  id: "",
  formula: "",
  belongToModifiersListId: "",
};
export const defaultInsertModifier: InsertModifier = {
  id: "",
  formula: "",
  belongToModifiersListId: "",
}