import { usage_timestamp as UsageTimestamp } from "../../drizzle/schema";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// TS
export type SelectUsageTimestamp = InferSelectModel<typeof UsageTimestamp>;
export type InsertUsageTimestamp = InferInsertModel<typeof UsageTimestamp>;

// Zod
export const SelectUsageTimestampSchema = createSelectSchema(UsageTimestamp);
export const InsertUsageTimestampSchema = createInsertSchema(UsageTimestamp);

// default
export const defaultSelectUsageTimestamp: SelectUsageTimestamp = {
  timestamp: new Date(),
  statisticsId: "defaultSelectUsageTimestamp",
};
// export const defaultInsertUsageTimestamp: InsertUsageTimestamp = {
//   timestamp: new Date(),
//   statisticsId: "defaultInsertUsageTimestamp",
// }