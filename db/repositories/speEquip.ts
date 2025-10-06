import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { insertStatistic } from "./statistic";
import { crystalSubRelations, insertCrystal, CrystalWithRelationsSchema } from "./crystal";
import { createId } from "@paralleldrive/cuid2";
import { special, crystal, DB, image, item, recipe, recipe_ingredient } from "../generated/kysely/kysely";
import { insertRecipe } from "./recipe";
import { insertImage } from "./image";
import { insertRecipeIngredient } from "./recipeIngredient";
import { insertItem } from "./item";
import { specialSchema, itemSchema } from "@db/generated/zod";
import { z } from "zod/v3";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type Special = Selectable<special>;
export type SpecialInsert = Insertable<special>;
export type SpecialUpdate = Updateable<special>;

// 2. 关联查询定义
const speEquipSubRelationDefs = defineRelations({
  defaultCrystals: {
    build: (eb: ExpressionBuilder<DB, "item">, id: Expression<string>) =>
      jsonArrayFrom(
        eb
          .selectFrom("_crystalTospecial")
          .innerJoin("crystal", "_crystalTospecial.A", "crystal.itemId")
          .where("_crystalTospecial.B", "=", id)
          .selectAll("crystal")
          .select((subEb) => crystalSubRelations(subEb, subEb.val("crystal.itemId")))
      ).as("defaultCrystals"),
    schema: z.array(CrystalWithRelationsSchema).describe("默认水晶列表"),
  },
});

const speEquipRelationsFactory = makeRelations(speEquipSubRelationDefs);
export const SpecialWithRelationsSchema = z.object({
  ...specialSchema.shape,
  ...itemSchema.shape,
  ...speEquipRelationsFactory.schema.shape,
});
export const speEquipSubRelations = speEquipRelationsFactory.subRelations;

// 3. 基础 CRUD 方法
export async function findSpecialById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("special")
    .where("itemId", "=", id)
    .selectAll("special")
    .executeTakeFirst() || null;
}

export async function findSpecials(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("special")
    .selectAll("special")
    .execute();
}

export async function insertSpecial(trx: Transaction<DB>, data: SpecialInsert) {
  return await trx
    .insertInto("special")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createSpecial(trx: Transaction<DB>, data: SpecialInsert) {
  // 注意：createSpecial 内部自己处理事务，所以我们需要在外部事务中直接插入
  const special = await trx
    .insertInto("special")
    .values({
      ...data,
      itemId: data.itemId || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  
  return special;
}

export async function updateSpecial(trx: Transaction<DB>, id: string, data: SpecialUpdate) {
  return await trx
    .updateTable("special")
    .set(data)
    .where("itemId", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteSpecial(trx: Transaction<DB>, id: string) {
  return await trx
    .deleteFrom("special")
    .where("itemId", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findSpecialWithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("special")
    .innerJoin("item", "item.id", "special.itemId")
    .where("item.id", "=", id)
    .selectAll(["special", "item"])
    .select((eb) => speEquipSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findSpecialByItemId(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("special")
    .innerJoin("item", "item.id", "special.itemId")
    .where("item.id", "=", id)
    .selectAll(["special", "item"])
    .select((eb) => speEquipSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type SpecialWithRelations = Awaited<ReturnType<typeof findSpecialWithRelations>>;

// export async function createSpecial(
//   newSpecial: item & {
//     speEquip: special & {
//       defaultCrystals: crystal[];
//       image: image;
//     };
//     repice: recipe & {
//       ingredients: recipe_ingredient[];
//     };
//   },
// ) {
//   const db = trx || await getDB();
//   return await db.transaction().execute(async (trx) => {
//     const { speEquip: _speEquipInput, repice: recipeInput, ...itemInput } = newSpecial;
//     const { image: imageInput, defaultCrystals: defaultCrystalsInput, ...speEquipInput } = _speEquipInput;
//     const { ingredients: recipeIngredientsInput } = recipeInput;
//     const image = await insertImage(trx, imageInput);
//     const defaultCrystals = await Promise.all(defaultCrystalsInput.map((crystal) => insertCrystal(trx, crystal)));
//     const recipe = await insertRecipe(trx, { ...recipeInput, id: createId() });
//     const recipeIngredients = await Promise.all(
//       recipeIngredientsInput.map((ingredient) => insertRecipeIngredient(trx, { ...ingredient, recipeId: recipe.id })),
//     );
//     const statistic = await insertStatistic(trx);
//     const item = await insertItem(trx, {
//       ...itemInput,
//       id: createId(),
//       statisticId: statistic.id,
//     });
//     const speEquip = await insertSpecial(trx, {
//       ...speEquipInput,
//       itemId: item.id,
//     });
//     return {
//       ...item,
//       speEquip: {
//         ...speEquip,
//         defaultCrystals,
//         image,
//       },
//       recipe: {
//         ...recipe,
//         ingredients: recipeIngredients,
//       },
//     };
//   });
// }
