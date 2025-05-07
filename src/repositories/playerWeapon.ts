import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, player_weapon } from "~/../db/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { crystalSubRelations } from "./crystal";
import { weaponSubRelations } from "./weapon";
import { DataType } from "./untils";

export interface PlayerWeapon extends DataType<player_weapon> {
  MainTable: Awaited<ReturnType<typeof findPlayerWeapons>>[number];
  MainForm: player_weapon;
}

export function playerWeponSubRelations(eb: ExpressionBuilder<DB, "player_weapon">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("item")
        .innerJoin("crystal", "item.id", "crystal.itemId")
        .innerJoin("_crystalToplayer_weapon", "item.id", "_crystalToplayer_weapon.A")
        .whereRef("_crystalToplayer_weapon.B", "=", "player_weapon.id")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("item.id")))
        .selectAll(["item", "crystal"]),
    ).as("crystalList"),
    jsonObjectFrom(
      eb
        .selectFrom("item")
        .innerJoin("weapon", "item.id", "weapon.itemId")
        .whereRef("weapon.itemId", "=", "player_weapon.templateId")
        .select((subEb) => weaponSubRelations(subEb, subEb.val("weapon.itemId")))
        .selectAll("weapon"),
    )
      .$notNull()
      .as("template"),
  ];
}

export async function findPlayerWeaponById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("player_weapon")
    .where("id", "=", id)
    .selectAll("player_weapon")
    .select((eb) => playerWeponSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findPlayerWeapons() {
  const db = await getDB();
  return await db.selectFrom("player_weapon").selectAll("player_weapon").execute();
}

export async function updatePlayerWeapon(id: string, updateWith: PlayerWeapon["Update"]) {
  const db = await getDB();
  return await db.updateTable("player_weapon").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function insertPlayerWeapon(trx: Transaction<DB>, newWeapon: PlayerWeapon["Insert"]) {
  return await trx.insertInto("player_weapon").values(newWeapon).returningAll().executeTakeFirstOrThrow();
}

export async function createPlayerWeapon(newWeapon: PlayerWeapon["Insert"]) {
  const db = await getDB();
  return await db.transaction().execute(async (trx) => {
    const player_weapon = await trx
      .insertInto("player_weapon")
      .values(newWeapon)
      .returningAll()
      .executeTakeFirstOrThrow();
    return player_weapon;
  });
}

export async function deletePlayerWeapon(id: string) {
  const db = await getDB();
  return await db.deleteFrom("player_weapon").where("id", "=", id).returningAll().executeTakeFirst();
}
