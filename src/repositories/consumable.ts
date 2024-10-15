import { consumable as Consumable } from "~/../db/schema";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  defaultSelectModifiersList,
  InsertModifiersListSchema,
  SelectModifiersList,
  SelectModifiersListSchema,
} from "./modifiers_list";
import {
  defaultSelectStatistics,
  InsertStatisticsSchema,
  SelectStatistics,
  SelectStatisticsSchema,
} from "./statistics";

// TS
export type SelectConsumable = InferSelectModel<typeof Consumable> & {
  modifiersList: SelectModifiersList;
  statistics: SelectStatistics;
};
export type InsertConsumable = InferInsertModel<typeof Consumable>;

// Zod
export const SelectConsumableSchema = createSelectSchema(Consumable).extend({
  modifiersList: SelectModifiersListSchema,
  statistics: SelectStatisticsSchema,
});
export const InsertConsumableSchema = createInsertSchema(Consumable).extend({
  modifiersList: InsertModifiersListSchema,
  statistics: InsertStatisticsSchema,
});

export const defaultSelectConsumable: SelectConsumable = {
  id: "",
  name: "",
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
