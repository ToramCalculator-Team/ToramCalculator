import { modifiers_list as ModifiersList } from "../../drizzle/schema";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  defaultInsertModifier,
  defaultSelectModifier,
  InsertModifier,
  InsertModifierSchema,
  SelectModifier,
  SelectModifierSchema,
} from "./modifier";
import { z } from "zod";

// TS
export type SelectModifiersList = InferSelectModel<typeof ModifiersList> & {
  modifiers: SelectModifier[];
};
export type InsertModifiersList = InferInsertModel<typeof ModifiersList> & {
  modifiers: InsertModifier[];
};

// Zod
export const SelectModifiersListSchema = createSelectSchema(ModifiersList).extend({
  modifiers: z.array(SelectModifierSchema),
});
export const InsertModifiersListSchema = createInsertSchema(ModifiersList).extend({
  modifiers: z.array(InsertModifierSchema),
});

// default
export const defaultSelectModifiersList: SelectModifiersList = {
  id: "defaultSelectModifiersList",
  name: "defaultSelectModifiersList",
  modifiers: [defaultSelectModifier],
};
export const defaultInsertModifiersList: InsertModifiersList = {
  id: "defaultInsertModifiersList",
  name: "defaultInsertModifiersList",
  modifiers: [defaultInsertModifier],
};
