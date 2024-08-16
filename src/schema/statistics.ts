import { z } from "zod";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { statistics as Statistics } from "../../drizzle/schema";
import {
  defaultSelectUsageTimestamp,
  InsertUsageTimestamp,
  InsertUsageTimestampSchema,
  SelectUsageTimestamp,
  SelectUsageTimestampSchema,
} from "./usage_timestamp";
import {
  defaultSelectViewTimestamp,
  InsertViewTimestamp,
  InsertViewTimestampSchema,
  SelectViewTimestamp,
  SelectViewTimestampSchema,
} from "./view_timestamp";
import {
  defaultInsertRate,
  defaultSelectRate,
  InsertRate,
  InsertRateSchema,
  SelectRate,
  SelectRateSchema,
} from "./rate";

// TS
export type SelectStatistics = InferSelectModel<typeof Statistics> & {
  usageTimestamps: SelectUsageTimestamp[];
  viewTimestamps: SelectViewTimestamp[];
  rates: SelectRate[];
};
export type InsertStatistics = InferInsertModel<typeof Statistics> & {
  usageTimestamps: InsertUsageTimestamp[];
  viewTimestamps: InsertViewTimestamp[];
  rates: InsertRate[];
};

// Zod
export const SelectStatisticsSchema = createSelectSchema(Statistics).extend({
  usageTimestamps: z.array(SelectUsageTimestampSchema),
  viewTimestamps: z.array(SelectViewTimestampSchema),
  rates: z.array(SelectRateSchema),
});
export const InsertStatisticsSchema = createInsertSchema(Statistics).extend({
  usageTimestamps: z.array(InsertUsageTimestampSchema),
  viewTimestamps: z.array(InsertViewTimestampSchema),
  rates: z.array(InsertRateSchema),
});

// default
export const defaultSelectStatistics: SelectStatistics = {
  id: "defaultSelectStatistics",
  usageTimestamps: [defaultSelectUsageTimestamp],
  viewTimestamps: [defaultSelectViewTimestamp],
  rates: [defaultSelectRate],
  monsterId: null,
  crystalId: null,
  mainWeaponId: null,
  subWeaponId: null,
  bodyArmorId: null,
  additionalEquipmentId: null,
  specialEquipmentId: null,
  skillId: null,
  petId: null,
  consumableId: null,
  characterId: null,
  analyzerId: null,
};
// export const defaultInsertStatistics: InsertStatistics = {
//   usageTimestamps: [defaultInsertUsageTimestamp],
//   viewTimestamps: [defaultInsertViewTimestamp],
//   rates: [defaultInsertRate],
//   monsterId: null,
//   crystalId: null,
//   mainWeaponId: null,
//   subWeaponId: null,
//   bodyArmorId: null,
//   additionalEquipmentId: null,
//   specialEquipmentId: null,
//   skillId: null,
//   petId: null,
//   consumableId: null,
//   characterId: null,
//   analyzerId: null,
// };
