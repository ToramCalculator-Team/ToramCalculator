import { analyzer as Analyzer } from "~/../db/schema";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import {
  SelectStatistics,
  SelectStatisticsSchema,
  InsertStatisticsSchema,
  defaultSelectStatistics,
  InsertStatistics,
} from "./statistics";

// TS
export type SelectAnalyzer = InferSelectModel<typeof Analyzer> & {
  statistics: SelectStatistics;
};
export type InsertAnalyzer = InferInsertModel<typeof Analyzer> & {
  statistics: InsertStatistics;
};

// Zod
export const SelectAnalyzerSchema = createSelectSchema(Analyzer).extend({
  statistics: SelectStatisticsSchema,
});
export const InsertAnalyzerSchema = createInsertSchema(Analyzer).extend({
  statistics: InsertStatisticsSchema,
});

export const defaultSelectAnalyzer: SelectAnalyzer = {
  id: "",

  name: "",
  monsterId: null,
  characterId: null,
  extraDetails: "",

  updatedAt: new Date(),
  updatedByUserId: "",
  createdAt: new Date(),
  createdByUserId: "",
  statistics: defaultSelectStatistics,
  statisticsId: "",
};
