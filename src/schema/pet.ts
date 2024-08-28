import { pet as Pet } from "~/../drizzle/schema";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { SelectStatistics, InsertStatistics, SelectStatisticsSchema, InsertStatisticsSchema, defaultSelectStatistics } from "./statistics";

// TS
export type SelectPet = InferSelectModel<typeof Pet> & {
  statistics: SelectStatistics
};
export type InsertPet = InferInsertModel<typeof Pet> & {
  statistics: InsertStatistics
};

// Zod
export const SelectPetSchema = createSelectSchema(Pet).extend({
  statistics: SelectStatisticsSchema
}); 
export const InsertPetSchema = createInsertSchema(Pet).extend({
  statistics: InsertStatisticsSchema
});

export const defaultSelectPet: SelectPet = {
  id: "",
  name: null,
  dataSources: "",
  extraDetails: "",

  updatedAt: new Date(),
  updatedByUserId: "",
  createdAt: new Date(),
  createdByUserId: "",
  statistics: defaultSelectStatistics,
  statisticsId: "",
};
