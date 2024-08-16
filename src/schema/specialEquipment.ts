import { type Prisma } from "@prisma/client";
import { SpecialEquipmentSchema } from "prisma/generated/zod";
import { z, type ZodType } from "zod";
import { CrystalInclude, CrystalInputSchema, defaultCrystal } from "./crystal";
import { ModifiersListInputSchema, defaultModifiersList, ModifiersListInclude } from "./modifiersList";
import { StatisticsInputSchema, defaultStatistics, StatisticsInclude } from "./statistics";

export const SpecialEquipmentInclude = {
  include: {
    modifiersList: ModifiersListInclude,
    crystal: CrystalInclude,
    statistics: StatisticsInclude,
  },
}

export type SpecialEquipment = Prisma.SpecialEquipmentGetPayload<typeof SpecialEquipmentInclude>;

export const SpecialEquipmentInputSchema = SpecialEquipmentSchema.extend({
  modifiersList: ModifiersListInputSchema,
  crystal: z.array(CrystalInputSchema),
  statistics: StatisticsInputSchema,
}) satisfies ZodType<SpecialEquipment>;

export const defaultSpecialEquipment: SpecialEquipment = {
  id: "",
  name: "",
  crystal: [defaultCrystal],
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
