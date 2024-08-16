import { view_timestamp as ViewTimestamp } from "../../drizzle/schema";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// TS
export type SelectViewTimestamp = InferSelectModel<typeof ViewTimestamp>;
export type InsertViewTimestamp = InferInsertModel<typeof ViewTimestamp>;

// Zod
export const SelectViewTimestampSchema = createSelectSchema(ViewTimestamp);
export const InsertViewTimestampSchema = createInsertSchema(ViewTimestamp);

// default
export const defaultSelectViewTimestamp: SelectViewTimestamp = {
  timestamp: new Date(),
  statisticsId: "defaultSelectViewTimestamp",
};
// export const defaultInsertViewTimestamp: InsertViewTimestamp = {
//   timestamp: new Date(),
//   statisticsId: "defaultSelectViewTimestamp",
// };
