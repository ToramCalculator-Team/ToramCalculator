import { MainWeaponSchema } from "prisma/generated/zod";
import { ModifiersListInputSchema, defaultModifiersList, ModifiersListInclude } from "./modifiersList";
import { CrystalInclude, CrystalInputSchema, defaultCrystal } from "./crystal";
import { type ZodType, z } from "zod";
import { type Prisma } from "@prisma/client";
import { StatisticsInputSchema, defaultStatistics, StatisticsInclude } from "./statistics";

export const MainWeaponInclude = {
    include: {
        modifiersList: ModifiersListInclude,
        crystal: CrystalInclude,
        statistics: StatisticsInclude
    }
}

export type MainWeapon = Prisma.MainWeaponGetPayload<typeof MainWeaponInclude>;

export const MainWeaponInputSchema = MainWeaponSchema.extend({
    modifiersList: ModifiersListInputSchema,
    crystal: z.array(CrystalInputSchema),
    statistics: StatisticsInputSchema,
}) satisfies ZodType<MainWeapon>;

export const defaultMainWeapon: MainWeapon = {
  id: "",
  name: "",
  mainWeaponType: "MAGIC_DEVICE",
  baseAtk: 0,
  refinement: 0,
  stability: 0,
  element: "NO_ELEMENT",
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