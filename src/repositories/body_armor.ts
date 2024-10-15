import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  defaultSelectStatistics,
  InsertStatistics,
  InsertStatisticsSchema,
  SelectStatistics,
  SelectStatisticsSchema,
} from "./statistics";
import { body_armor as BodyArmor } from "~/../db/schema";
import { SelectCrystal, InsertCrystal, SelectCrystalSchema, InsertCrystalSchema, defaultSelectCrystal } from "./crystal";
import { SelectModifiersList, InsertModifiersList, SelectModifiersListSchema, InsertModifiersListSchema, defaultSelectModifiersList } from "./modifiers_list";
import { z } from "zod";

// TS
export type SelectBodyArmor = InferSelectModel<typeof BodyArmor> & {
  modifiersList: SelectModifiersList;
  crystal: SelectCrystal[];
  statistics: SelectStatistics;
};
export type InsertBodyArmor = InferInsertModel<typeof BodyArmor> & {
  modifiersList: InsertModifiersList;
  crystal: InsertCrystal[];
  statistics: InsertStatistics;
};

// Zod
export const SelectBodyArmorSchema = createSelectSchema(BodyArmor).extend({
  modifiersList: SelectModifiersListSchema,
  crystal: z.array(SelectCrystalSchema),
  statistics: SelectStatisticsSchema,
})
export const InsertBodyArmorSchema = createInsertSchema(BodyArmor).extend({
  modifiersList: InsertModifiersListSchema,
  crystal: z.array(InsertCrystalSchema),
  statistics: InsertStatisticsSchema,
})

export const defaultSelectBodyArmor: SelectBodyArmor = {
  id: "",
  name: "",
  bodyArmorType: "NORMAL",
  refinement: 0,
  baseDef: 0,
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
