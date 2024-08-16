import { type Prisma } from "@prisma/client";
import { AnalyzerSchema } from "prisma/generated/zod";
import { StatisticsInputSchema, defaultStatistics, StatisticsInclude } from "./statistics";
import { z, type ZodType } from "zod";

export const AnalyzerInclude = {
  include: {
    statistics: StatisticsInclude,
  }
}

export type Analyzer = Prisma.AnalyzerGetPayload<typeof AnalyzerInclude>;

export const AnalyzerInputSchema = AnalyzerSchema.extend({
  statistics: StatisticsInputSchema,
}) satisfies ZodType<Analyzer>;

export const defaultAnalyzer: Analyzer = {
  id: "",

  name: "",
  monsterId: null,
  characterId: null,
  extraDetails: "",

  updatedAt: new Date(),
  updatedByUserId: "",
  createdAt: new Date(),
  createdByUserId: "",
  statistics: defaultStatistics,
  statisticsId: "",
};