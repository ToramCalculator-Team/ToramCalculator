import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  defaultSelectStatistics,
  InsertStatistics,
  InsertStatisticsSchema,
  SelectStatistics,
  SelectStatisticsSchema,
} from "./statistics";
import { main_weapon as MainWeapon } from "~/../db/schema";
import { SelectCrystal, InsertCrystal, SelectCrystalSchema, InsertCrystalSchema, defaultSelectCrystal } from "./crystal";
import { SelectModifiersList, InsertModifiersList, SelectModifiersListSchema, InsertModifiersListSchema, defaultSelectModifiersList } from "./modifiers_list";

// TS
export type SelectMainWeapon = InferSelectModel<typeof MainWeapon> & {
    modifiersList: SelectModifiersList;
    crystal: SelectCrystal[];
    statistics: SelectStatistics;
};
export type InsertMainWeapon = InferInsertModel<typeof MainWeapon> & {
    modifiersList: InsertModifiersList;
    crystal: InsertCrystal[];
    statistics: InsertStatistics;
};

// Zod
export const SelectMainWeaponSchema = createSelectSchema(MainWeapon).extend({
    modifiersList: SelectModifiersListSchema,
    crystal: SelectCrystalSchema.array(),
    statistics: SelectStatisticsSchema
})
export const InsertMainWeaponSchema = createInsertSchema(MainWeapon).extend({
    modifiersList: InsertModifiersListSchema,
    crystal: InsertCrystalSchema.array(),
    statistics: InsertStatisticsSchema
})

export const defaultSelectMainWeapon: SelectMainWeapon = {
  id: "",
  name: "",
  mainWeaponType: "MAGIC_DEVICE",
  baseAtk: 0,
  refinement: 0,
  stability: 0,
  element: "NO_ELEMENT",
  crystal: [defaultSelectCrystal],
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