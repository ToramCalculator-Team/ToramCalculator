import { mob as Mob } from "~/../db/schema";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  defaultInsertMonster,
  defaultSelectMonster,
  InsertMonster,
  InsertMonsterSchema,
  SelectMonster,
  SelectMonsterSchema,
} from "./monster";

// TS
export type SelectMob = InferSelectModel<typeof Mob> & {
  monster: SelectMonster;
};
export type InsertMob = InferInsertModel<typeof Mob> & {
  monster: InsertMonster;
};

// Zod
export const SelectMobSchema = createSelectSchema(Mob).extend({
  monster: SelectMonsterSchema,
});
export const InsertMobSchema = createInsertSchema(Mob).extend({
  monster: InsertMonsterSchema,
});

// Default
export const defaultSelectMob: SelectMob = {
  id: "",
  monster: defaultSelectMonster,
  monsterId: "",
  star: 1,
  flow: "",
};
export const defaultInsertMob: InsertMob = {
  id: "",
  monster: defaultInsertMonster,
  monsterId: "",
  star: 1,
  flow: "",
};
