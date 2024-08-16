import { SubWeaponSchema } from "prisma/generated/zod";
import { ModifiersListInputSchema, defaultModifiersList, ModifiersListInclude } from "./modifiersList";
import { type Prisma } from "@prisma/client";
import { z, type ZodType } from "zod";
import { StatisticsInputSchema, defaultStatistics, StatisticsInclude } from "./statistics";

export const SubWeaponInclude = {
  include: {
    modifiersList: ModifiersListInclude,
    statistics: StatisticsInclude,
  },
}

export type SubWeapon = Prisma.SubWeaponGetPayload<typeof SubWeaponInclude>;

export const SubWeaponInputSchema = SubWeaponSchema.extend({
  modifiersList: ModifiersListInputSchema,
  statistics: StatisticsInputSchema,
}) satisfies ZodType<SubWeapon>;

export const defaultSubWeapon: SubWeapon = {
  id: "",
  name: "",
  subWeaponType: "NO_WEAPON",
  baseAtk: 0,
  refinement: 0,
  stability: 0,
  element: "NO_ELEMENT",
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
