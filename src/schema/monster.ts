import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { monster as Monster } from "~/../db/schema";
import {
  defaultSelectStatistics,
  InsertStatistics,
  InsertStatisticsSchema,
  SelectStatistics,
  SelectStatisticsSchema,
} from "./statistics";

// TS
export type SelectMonster = InferSelectModel<typeof Monster> & {
  statistics: SelectStatistics;
};
export type InsertMonster = InferInsertModel<typeof Monster> & {
  statistics: InsertStatistics;
};

// ZOD
export const SelectMonsterSchema = createSelectSchema(Monster).extend({
  statistics: SelectStatisticsSchema,
});
export const InsertMonsterSchema = createInsertSchema(Monster).extend({
  statistics: InsertStatisticsSchema,
});

// default
export const defaultSelectMonster: SelectMonster = {
  id: "defaultSelectMonster",
  imageId: "",

  name: "defaultSelectMonster",
  monsterType: "COMMON_BOSS",
  baseLv: 0,
  experience: 0,
  address: "",
  element: "NO_ELEMENT",
  radius: 1,
  maxhp: 0,
  physicalDefense: 0,
  physicalResistance: 0,
  magicalDefense: 0,
  magicalResistance: 0,
  criticalResistance: 0,
  avoidance: 0,
  dodge: 0,
  block: 0,
  normalAttackResistanceModifier: 0,
  physicalAttackResistanceModifier: 0,
  magicalAttackResistanceModifier: 0,
  difficultyOfTank: 5,
  difficultyOfMelee: 5,
  difficultyOfRanged: 5,
  possibilityOfRunningAround: 0,
  dataSources: "",
  extraDetails: "",

  updatedAt: new Date(),
  updatedByUserId: "",
  createdAt: new Date(),
  createdByUserId: "",
  statistics: defaultSelectStatistics,
  statisticsId: "",
};
export const defaultInsertMonster: InsertMonster = {
  id: "defaultInsertMonster",
  imageId: "",

  name: "",
  monsterType: "COMMON_BOSS",
  baseLv: 0,
  experience: 0,
  address: "",
  element: "NO_ELEMENT",
  radius: 1,
  maxhp: 0,
  physicalDefense: 0,
  physicalResistance: 0,
  magicalDefense: 0,
  magicalResistance: 0,
  criticalResistance: 0,
  avoidance: 0,
  dodge: 0,
  block: 0,
  normalAttackResistanceModifier: 0,
  physicalAttackResistanceModifier: 0,
  magicalAttackResistanceModifier: 0,
  difficultyOfTank: 5,
  difficultyOfMelee: 5,
  difficultyOfRanged: 5,
  possibilityOfRunningAround: 0,
  dataSources: "",
  extraDetails: "",

  updatedAt: new Date(),
  updatedByUserId: "",
  createdAt: new Date(),
  createdByUserId: "",
  statistics: defaultSelectStatistics,
  statisticsId: "",
};

export const testMonsterQueryData: SelectMonster[] = [
  defaultSelectMonster,
  defaultSelectMonster,
  defaultSelectMonster,
  defaultSelectMonster,
  defaultSelectMonster,
  defaultSelectMonster,
  defaultSelectMonster,
  defaultSelectMonster,
  defaultSelectMonster,
  defaultSelectMonster,
  defaultSelectMonster,
  defaultSelectMonster,
  defaultSelectMonster,
  defaultSelectMonster,
  defaultSelectMonster,
  defaultSelectMonster,
]