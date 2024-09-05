import { rate as Rate } from "~/../db/schema";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// TS
export type SelectRate = InferSelectModel<typeof Rate>;
export type InsertRate = InferInsertModel<typeof Rate>;

// Zod
export const SelectRateSchema = createSelectSchema(Rate);
export const InsertRateSchema = createInsertSchema(Rate);

// Default
export const defaultSelectRate: SelectRate = {
  id: "",
  rate: 0,
  userId: "",
  statisticsId: ""
};
export const defaultInsertRate: InsertRate = {
  id: "",
  rate: 0,
  userId: "",
  statisticsId: ""
}