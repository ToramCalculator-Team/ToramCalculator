import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  defaultSelectStatistics,
  InsertStatistics,
  InsertStatisticsSchema,
  SelectStatistics,
  SelectStatisticsSchema,
} from "./statistics";
import { additional_equipment as AdditionalEquipment } from "../../drizzle/schema";
import { defaultSelectCrystal, SelectCrystal, SelectCrystalSchema } from "./crystal";
import { defaultSelectModifiersList, SelectModifiersList, SelectModifiersListSchema } from "./modifiers_list";

// TS
export type SelectAdditionalEquipment = InferSelectModel<typeof AdditionalEquipment> & {
  crystal: SelectCrystal[];
  modifiersList: SelectModifiersList;
  statistics: SelectStatistics;
}

export const  SelectAdditionalEquipmentSchema = createSelectSchema(AdditionalEquipment).extend({
  crystal: SelectCrystalSchema.array(),
  modifiersList: SelectModifiersListSchema,
  statistics: SelectStatisticsSchema,
});

export const defaultSelectAdditionalEquipment: SelectAdditionalEquipment = {
  id: "",
  name: "",
  refinement: 0,
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

export const AdditionalEquipmentInputHiddenFields = ["id", "createdByUserId", "updatedByUserId", "modifiersListId", "statisticsId"]
