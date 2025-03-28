import { db } from "./database";
import { user, DB } from "../../../db/serverDB/kysely/kyesely";

export type User = ReturnType<typeof findUserById>

export async function findUserById(id: string) {
  return await db.selectFrom("user").where("id", "=", id).selectAll().executeTakeFirstOrThrow();
}