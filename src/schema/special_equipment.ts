import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { special_equipment as SpecialEquipment } from "~/../drizzle/schema";
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
import { defaultSelectCrystal, InsertCrystal, SelectCrystal } from "./crystal";

// TS
export type SelectSpecialEquipment = InferSelectModel<typeof SpecialEquipment> & {
  crystal: SelectCrystal[];
  modifiersList: SelectModifiersList;
  statistics: SelectStatistics;
};
export type InsertSpecialEquipment = InferInsertModel<typeof SpecialEquipment> & {
  srystal: InsertCrystal[];
  modifiersList: InsertModifiersList;
  statistics: InsertStatistics;
};

// Zod
export const SelectSpecialEquipmentSchema = createSelectSchema(SpecialEquipment).extend({
  modifiersList: SelectModifiersListSchema,
  statistics: SelectStatisticsSchema,
});
export const InsertSpecialEquipmentSchema = createInsertSchema(SpecialEquipment).extend({
  modifiersList: InsertModifiersListSchema,
  statistics: InsertStatisticsSchema,
});

export const defaultSpecialEquipment: SelectSpecialEquipment = {
  id: "",
  name: "",
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
