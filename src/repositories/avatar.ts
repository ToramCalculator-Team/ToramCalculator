import { Expression, ExpressionBuilder } from "kysely";
import { getDB } from "./database";
import { DB, avatar } from "~/../db/kysely/kyesely";
import { DataType } from "./untils";

export interface Avatar extends DataType<avatar> {
  MainTable: Awaited<ReturnType<typeof findAvatars>>[number];
}

export function avatarSubRelations(eb: ExpressionBuilder<DB, "avatar">, id: Expression<string>) {
  return [];
}

export async function findAvatarById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("avatar")
    .where("id", "=", id)
    .selectAll("avatar")
    .select((eb) => avatarSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findAvatars() {
  const db = await getDB();
  return await db.selectFrom("avatar").selectAll("avatar").execute();
}

export async function updateAvatar(id: string, updateWith: Avatar["Update"]) {
  const db = await getDB();
  return await db.updateTable("avatar").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function deleteAvatar(id: string) {
  const db = await getDB();
  return await db.deleteFrom("avatar").where("id", "=", id).returningAll().executeTakeFirst();
}
