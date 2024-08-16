import { type Prisma } from "@prisma/client";
import { ConsumableSchema } from "prisma/generated/zod";
import { type ZodType } from "zod";
import { ModifiersListInputSchema, defaultModifiersList, ModifiersListInclude } from "./modifiers_list";
import { StatisticsInputSchema, defaultStatistics, StatisticsInclude } from "./statistics";

export const ConsumableInclude = {
  include: {
    modifiersList: ModifiersListInclude,
    statistics: StatisticsInclude,
  },
}

export type Consumable = Prisma.ConsumableGetPayload<typeof ConsumableInclude>;

export const ConsumableInputSchema = ConsumableSchema.extend({
  modifiersList: ModifiersListInputSchema,
  statistics: StatisticsInputSchema,
}) satisfies ZodType<Consumable>;

export const defaultConsumable: Consumable = {
  id: "",
  name: "",
  modifiersList: defaultModifiersList,
  modifiersListId: defaultModifiersList.id,
  dataSources: "",
  extraDetails: "",

  updatedAt: new Date(),
  updatedByUserId: "",
  createdAt: new Date(),
  createdByUserId: "",
  statistics: defaultStatistics,
  statisticsId: "",
};
