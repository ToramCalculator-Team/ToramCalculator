import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { createId } from "@paralleldrive/cuid2";
import { weapon, crystal, DB, image, item, recipe, recipe_ingredient } from "../generated/kysely/kysely";
import { createStatistic } from "./statistic";
import { createItem } from "./item";
import { store } from "~/store";
import { crystalSubRelations } from "./crystal";
import { CrystalWithRelationsSchema } from "./crystal";
import { weaponSchema } from "@db/generated/zod";
import { z } from "zod/v3";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type Weapon = Selectable<weapon>;
export type WeaponInsert = Insertable<weapon>;
export type WeaponUpdate = Updateable<weapon>;

// 2. 关联查询定义  
const weaponSubRelationDefs = defineRelations({
  defaultCrystals: {
    build: (eb: ExpressionBuilder<DB, "item">, id: Expression<string>) => 
      jsonArrayFrom(
        eb
          .selectFrom("_crystalToplayer_weapon")
          .innerJoin("crystal", "_crystalToplayer_weapon.A", "crystal.itemId")
          .where("_crystalToplayer_weapon.B", "=", id)
          .selectAll("crystal")
          .select((subEb) => crystalSubRelations(subEb, subEb.val("crystal.itemId")))
      ).as("defaultCrystals"),
    schema: z.array(CrystalWithRelationsSchema).describe("默认水晶列表"),
  },
});

const weaponRelationsFactory = makeRelations(weaponSubRelationDefs);
export const WeaponWithRelationsSchema = z.object({
  ...weaponSchema.shape,
  ...weaponRelationsFactory.schema.shape,
});
export const weaponSubRelations = weaponRelationsFactory.subRelations;

// 3. 基础 CRUD 方法
export async function findWeaponById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();  
  return await db
    .selectFrom("weapon")
    .where("itemId", "=", id)
    .selectAll("weapon")
    .executeTakeFirst() || null;
}

export async function findWeapons(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("weapon")
    .innerJoin("item", "item.id", "weapon.itemId")
    .selectAll(["weapon", "item"])
    .execute();
}

export async function insertWeapon(trx: Transaction<DB>, data: WeaponInsert) {
  return await trx
    .insertInto("weapon")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createWeapon(trx: Transaction<DB>, data: WeaponInsert, itemData: Omit<Insertable<item>, 'id' | 'statisticId' | 'createdByAccountId' | 'updatedByAccountId'>) {
  // 1. 创建 statistic 记录
  const statistic = await createStatistic(trx);
  
  // 2. 创建 item 记录
  const item = await createItem(trx, {
    ...itemData,
    id: data.itemId || createId(),
    statisticId: statistic.id,
    createdByAccountId: store.session.account?.id,
    updatedByAccountId: store.session.account?.id,
  });
  
  // 3. 创建 weapon 记录（复用 insertWeapon）
  const weapon = await insertWeapon(trx, {
    ...data,
    itemId: item.id,
  });
  
  return weapon;
}

export async function updateWeapon(trx: Transaction<DB>, id: string, data: WeaponUpdate) {
  return await trx
    .updateTable("weapon")
    .set(data)
    .where("itemId", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteWeapon(trx: Transaction<DB>, id: string) {
  return await trx
    .deleteFrom("weapon")
    .where("itemId", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findWeaponWithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("weapon")
    .innerJoin("item", "item.id", "weapon.itemId")
    .where("item.id", "=", id)
    .selectAll(["weapon", "item"])
    .select((eb) => weaponSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findItemWithWeaponById(itemId: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("item")
    .innerJoin("weapon", "weapon.itemId", "item.id")
    .where("item.id", "=", itemId)
    .selectAll(["item", "weapon"])
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type WeaponWithRelations = Awaited<ReturnType<typeof findWeaponWithRelations>>;
