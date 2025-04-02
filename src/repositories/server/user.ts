import { db } from "./database";
import { user, DB } from "../../../db/serverDB/kysely/kyesely";
import { Insertable, Selectable, Updateable } from "kysely";

export type User = ReturnType<typeof findUserById>

export async function findUserById(id: string) {
  return await db.selectFrom("user").where("id", "=", id).selectAll().executeTakeFirst();
}

export async function findUserByEmail(email: string) {
  return await db.selectFrom("user").where("email", "=", email).selectAll().executeTakeFirst();
}

export async function createUser(user: Insertable<user>) {
  return await db.insertInto("user").values({
    ...user,
  }).returningAll().executeTakeFirstOrThrow();
}