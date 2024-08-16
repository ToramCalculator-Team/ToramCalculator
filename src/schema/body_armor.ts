import { BodyArmorSchema } from "prisma/generated/zod";
import { ModifiersListInputSchema, defaultModifiersList, ModifiersListInclude } from "./modifiers_list";
import { CrystalInclude, CrystalInputSchema, defaultCrystal } from "./crystal";
import { type ZodType, z } from "zod";
import { type Prisma } from "@prisma/client";
import { StatisticsInputSchema, defaultStatistics, StatisticsInclude } from "./statistics";

export const BodyArmorInclude = {
  include: {
    modifiersList: ModifiersListInclude,
    crystal: CrystalInclude,
    statistics: StatisticsInclude
  },
}

export type BodyArmor = Prisma.BodyArmorGetPayload<typeof BodyArmorInclude>;

export const BodyArmorInputSchema = BodyArmorSchema.extend({
  modifiersList: ModifiersListInputSchema,
  crystal: z.array(CrystalInputSchema),
  statistics: StatisticsInputSchema,
}) satisfies ZodType<BodyArmor>;

export const defaultBodyArmor: BodyArmor = {
  id: "",
  name: "",
  bodyArmorType: "NORMAL",
  refinement: 0,
  baseDef: 0,
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
