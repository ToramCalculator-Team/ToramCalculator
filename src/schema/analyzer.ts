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
import { defaultSelectMob, SelectMob } from "./mob";
import { defaultSelectMember, SelectMember } from "./team";

// TS
export type SelectAnalyzer = InferSelectModel<typeof Analyzer> & {
  mobs: SelectMob[];
  team: SelectMember[];
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
  id: "defaultSelectAnalyzer",

  name: "defaultSelectAnalyzer",
  mobs: [defaultSelectMob],
  team: [defaultSelectMember],
  extraDetails: "",

  updatedAt: new Date(),
  updatedByUserId: "",
  createdAt: new Date(),
  createdByUserId: "",
  statistics: defaultSelectStatistics,
  statisticsId: "",
};
