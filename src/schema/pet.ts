import { type Prisma } from "@prisma/client";
import { PetSchema } from "prisma/generated/zod";
import { z, type ZodType } from "zod";
import { StatisticsInputSchema, defaultStatistics, StatisticsInclude } from "./statistics";

export const PetInclude = {
  include: {
    statistics: StatisticsInclude,
  },
}

export type Pet = Prisma.PetGetPayload<typeof PetInclude>;

export const PetInputSchema = PetSchema.extend({
  statistics: StatisticsInputSchema,
}) satisfies ZodType<Pet>;

export const defaultPet: Pet = {
  id: "",
  name: null,
  dataSources: "",
  extraDetails: "",

  updatedAt: new Date(),
  updatedByUserId: "",
  createdAt: new Date(),
  createdByUserId: "",
  statistics: defaultStatistics,
  statisticsId: "",
};
