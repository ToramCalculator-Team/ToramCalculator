import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, recipe } from "../generated/kysely/kysely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { createId } from "@paralleldrive/cuid2";
import { recipeSchema, recipe_ingredientSchema } from "../generated/zod/index";
import { z } from "zod";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type Recipe = Selectable<recipe>;
export type RecipeInsert = Insertable<recipe>;
export type RecipeUpdate = Updateable<recipe>;

// 子关系定义
const recipeSubRelationDefs = defineRelations({
  recipeEntries: {
    build: (eb, id) =>
      jsonArrayFrom(
        eb
          .selectFrom("recipe_ingredient")
          .where("recipe_ingredient.recipeId", "=", id)
          .selectAll("recipe_ingredient")
      ).as("recipeEntries"),
    schema: z.array(recipe_ingredientSchema).describe("配方材料列表"),
  },
});

// 生成 factory
export const recipeRelationsFactory = makeRelations<"recipe", typeof recipeSubRelationDefs>(
  recipeSubRelationDefs
);

// 构造关系Schema
export const RecipeWithRelationsSchema = z.object({
  ...recipeSchema.shape,
  ...recipeRelationsFactory.schema.shape,
});

// 构造子关系查询器
export const recipeSubRelations = recipeRelationsFactory.subRelations;

// 3. 基础 CRUD 方法
export async function findRecipeById(id: string): Promise<Recipe | null> {
  const db = await getDB();
  return await db
    .selectFrom("recipe")
    .where("id", "=", id)
    .selectAll("recipe")
    .executeTakeFirst() || null;
}

export async function findRecipes(): Promise<Recipe[]> {
  const db = await getDB();
  return await db
    .selectFrom("recipe")
    .selectAll("recipe")
    .execute();
}

export async function insertRecipe(trx: Transaction<DB>, data: RecipeInsert): Promise<Recipe> {
  return await trx
    .insertInto("recipe")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createRecipe(trx: Transaction<DB>, data: RecipeInsert): Promise<Recipe> {
  // 注意：createRecipe 内部自己处理事务，所以我们需要在外部事务中直接插入
  const recipe = await trx
    .insertInto("recipe")
    .values({
      ...data,
      id: data.id || createId(),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  
  return recipe;
}

export async function updateRecipe(trx: Transaction<DB>, id: string, data: RecipeUpdate): Promise<Recipe> {
  return await trx
    .updateTable("recipe")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteRecipe(trx: Transaction<DB>, id: string): Promise<Recipe | null> {
  return await trx
    .deleteFrom("recipe")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 特殊查询方法
export async function findRecipeWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("recipe")
    .where("id", "=", id)
    .selectAll("recipe")
    .select((eb) => recipeSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type RecipeWithRelations = Awaited<ReturnType<typeof findRecipeWithRelations>>;
