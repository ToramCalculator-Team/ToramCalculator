import { user as User } from "~/../db/schema";
import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// TS
export type SelectUser = InferSelectModel<typeof User>;
export type InsertUser = InferInsertModel<typeof User>;

// Zod
export const SelectUserSchema = createSelectSchema(User);
export const InsertUserSchema = createInsertSchema(User);

// default
export const defaultSelectUser: SelectUser = {
  id: "defaultSelectUser",
  name: "defaultSelectUser",
  email: null,
  emailVerified: null,
  image: null,
  userRole: "USER"
};
export const defaultInsertUser: InsertUser = {
  id: "",
  name: "defaultSelectUser",
  email: null,
  emailVerified: null,
  image: null,
  userRole: "USER"
}