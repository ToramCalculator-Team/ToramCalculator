import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, player_weapon } from "../generated/kysely/kysely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { crystalSubRelations, CrystalWithRelationsSchema } from "./crystal";
import { WeaponWithRelationsSchema, weaponSubRelations } from "./weapon";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod/v3";
import { player_weaponSchema } from "@db/generated/zod";
import { defineRelations, makeRelations } from "./subRelationFactory";
import { itemSchema, crystalSchema } from "@db/generated/zod";

// 1. 类型定义
export type PlayerWeapon = Selectable<player_weapon>;
export type PlayerWeaponInsert = Insertable<player_weapon>;
export type PlayerWeaponUpdate = Updateable<player_weapon>;

// 2. 关联查询定义
const playerWeaponSubRelationDefs = defineRelations({
  crystalList: {
    build: (eb: ExpressionBuilder<DB, "player_weapon">, id: Expression<string>) => 
      jsonArrayFrom(
        eb
          .selectFrom("item")
          .innerJoin("crystal", "item.id", "crystal.itemId")
          .innerJoin("_crystalToplayer_weapon", "item.id", "_crystalToplayer_weapon.A")
          .whereRef("_crystalToplayer_weapon.B", "=", "player_weapon.id")
          .select((subEb) => crystalSubRelations(subEb, subEb.val("item.id")))
          .selectAll(["item", "crystal"])
      ).as("crystalList"),
    schema: z.array(
      z.object({
        ...itemSchema.shape,
        ...CrystalWithRelationsSchema.shape,
      })
    ).describe("水晶列表"),
  },
  // template: {
  //   build: (eb: ExpressionBuilder<DB, "player_weapon">, id: Expression<string>) => 
  //     jsonObjectFrom(
  //       eb
  //         .selectFrom("item")
  //         .innerJoin("weapon", "item.id", "weapon.itemId")
  //         .whereRef("weapon.itemId", "=", "player_weapon.templateId")
  //         .select((subEb) => weaponSubRelations(subEb, subEb.val("weapon.itemId")))
  //         .selectAll(["weapon", "item"])
  //     ).$notNull().as("template"),
  //   schema: WeaponWithRelationsSchema.describe("武器模板"),
  // },
});

const playerWeaponRelationsFactory = makeRelations(playerWeaponSubRelationDefs);
export const PlayerWeaponWithRelationsSchema = z.object({
  ...player_weaponSchema.shape,
  ...playerWeaponRelationsFactory.schema.shape,
});
export const playerWeaponSubRelations = playerWeaponRelationsFactory.subRelations;

// 3. 基础 CRUD 方法
export async function findPlayerWeaponById(id: string): Promise<PlayerWeapon | null> {
  const db = await getDB();
  return await db
    .selectFrom("player_weapon")
    .where("id", "=", id)
    .selectAll("player_weapon")
    .executeTakeFirst() || null;
}

export async function findPlayerWeapons(): Promise<PlayerWeapon[]> {
  const db = await getDB();
  return await db
    .selectFrom("player_weapon")
    .selectAll("player_weapon")
    .execute();
}

export async function insertPlayerWeapon(trx: Transaction<DB>, data: PlayerWeaponInsert): Promise<PlayerWeapon> {
  return await trx
    .insertInto("player_weapon")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createPlayerWeapon(trx: Transaction<DB>, data: PlayerWeaponInsert): Promise<PlayerWeapon> {
  // 注意：createPlayerWeapon 内部自己处理事务，所以我们需要在外部事务中直接插入
  const player_weapon = await trx
    .insertInto("player_weapon")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  
  return player_weapon;
}

export async function updatePlayerWeapon(trx: Transaction<DB>, id: string, data: PlayerWeaponUpdate): Promise<PlayerWeapon> {
  return await trx
    .updateTable("player_weapon")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deletePlayerWeapon(trx: Transaction<DB>, id: string): Promise<PlayerWeapon | null> {
  return await trx
    .deleteFrom("player_weapon")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findPlayerWeaponWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("player_weapon")
    .where("id", "=", id)
    .selectAll("player_weapon")
    .select((eb) => playerWeaponSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type PlayerWeaponWithRelations = Awaited<ReturnType<typeof findPlayerWeaponWithRelations>>;
