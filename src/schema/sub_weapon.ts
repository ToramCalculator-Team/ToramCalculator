import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { sub_weapon as SubWeapon } from "~/../drizzle/schema";
import {
  defaultSelectModifiersList,
  InsertModifiersList,
  InsertModifiersListSchema,
  SelectModifiersList,
  SelectModifiersListSchema,
} from "./modifiers_list";
import {
  defaultSelectStatistics,
  InsertStatistics,
  InsertStatisticsSchema,
  SelectStatistics,
  SelectStatisticsSchema,
} from "./statistics";

// TS
export type SelectSubWeapon = InferSelectModel<typeof SubWeapon> & {
  modifiersList: SelectModifiersList;
  statistics: SelectStatistics;
};
export type InsertSubWeapon = InferInsertModel<typeof SubWeapon> & {
  modifiersList: InsertModifiersList;
  statistics: InsertStatistics;
};

// Zod
export const SelectSubWeaponSchema = createSelectSchema(SubWeapon).extend({
  modifiersList: SelectModifiersListSchema,
  statistics: SelectStatisticsSchema,
});
export const InsertSubWeaponSchema = createInsertSchema(SubWeapon).extend({
  modifiersList: InsertModifiersListSchema,
  statistics: InsertStatisticsSchema,
});

// Default
export const defaultSelectSubWeapon: SelectSubWeapon = {
  id: "",
  name: "",
  subWeaponType: "NO_WEAPON",
  baseAtk: 0,
  refinement: 0,
  stability: 0,
  element: "NO_ELEMENT",
  modifiersList: defaultSelectModifiersList,
  modifiersListId: defaultSelectModifiersList.id,
  dataSources: "",
  extraDetails: "",

  updatedAt: new Date(),
  updatedByUserId: "",
  createdAt: new Date(),
  createdByUserId: "",
  statistics: defaultSelectStatistics,
  statisticsId: "",
};
