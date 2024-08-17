import { crystal as Crystal } from "../../drizzle/schema";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  SelectModifiersList,
  InsertModifiersList,
  SelectModifiersListSchema,
  InsertModifiersListSchema,
  defaultSelectModifiersList,
} from "./modifiers_list";
import {
  SelectStatistics,
  SelectStatisticsSchema,
  InsertStatisticsSchema,
  defaultSelectStatistics,
} from "./statistics";

// TS
export type SelectCrystal = InferSelectModel<typeof Crystal> & {
  modifiersList: SelectModifiersList;
  statistics: SelectStatistics;
};
export type InsertCrystal = InferInsertModel<typeof Crystal> & {
  modifiersList: InsertModifiersList;
};

// Zod
export const SelectCrystalSchema = createSelectSchema(Crystal).extend({
  modifiersList: SelectModifiersListSchema,
  statistics: SelectStatisticsSchema,
});
export const InsertCrystalSchema = createInsertSchema(Crystal).extend({
  modifiersList: InsertModifiersListSchema,
  statistics: InsertStatisticsSchema,
});

export const defaultSelectCrystal: SelectCrystal = {
  id: "",
  name: "defaultSelectCrystal",
  crystalType: "GENERAL",
  front: 0,
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
export const defaultInsertCrystal: InsertCrystal = {
  id: "",
  name: "defaultInsertCrystal",
  crystalType: "GENERAL",
  front: 0,
  modifiersList: defaultSelectModifiersList,
  modifiersListId: defaultSelectModifiersList.id,
  dataSources: "",
  extraDetails: "",

  updatedAt: new Date(),
  updatedByUserId: "",
  createdAt: new Date(),
  createdByUserId: "",
  statisticsId: "",
};

export const testCrystalQueryData: SelectCrystal[] = [
  defaultSelectCrystal,
  defaultSelectCrystal,
  defaultSelectCrystal,
  defaultSelectCrystal,
  defaultSelectCrystal,
  defaultSelectCrystal,
  defaultSelectCrystal,
  defaultSelectCrystal,
  defaultSelectCrystal,
  defaultSelectCrystal,
  defaultSelectCrystal,
  defaultSelectCrystal,
  defaultSelectCrystal,
  defaultSelectCrystal,
  defaultSelectCrystal,
]
