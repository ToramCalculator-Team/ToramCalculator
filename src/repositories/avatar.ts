import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, avatar } from "~/repositories/db/types";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";

export type Avatar = Awaited<ReturnType<typeof findAvatarById>>;
export type NewAvatar = Insertable<avatar>;
export type AvatarUpdate = Updateable<avatar>;

export function avatarSubRelations(eb: ExpressionBuilder<DB, "avatar">, id: Expression<string>) {
  return [];
}

export async function findAvatarById(id: string) {
  return await db
    .selectFrom("avatar")
    .where("id", "=", id)
    .selectAll("avatar")
    .select((eb) => avatarSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateAvatar(id: string, updateWith: AvatarUpdate) {
  return await db.updateTable("avatar").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function deleteAvatar(id: string) {
  return await db.deleteFrom("avatar").where("id", "=", id).returningAll().executeTakeFirst();
}

export const defaultAvatar: Avatar = {
  id: "",
  name: "",
  type: "",
  modifiers: [],
  playerId: "",
};
