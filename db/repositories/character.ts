import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, character } from "@db/generated/zod/index";
import { createStatistic, statisticSubRelations } from "./statistic";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { comboSubRelations } from "./combo";
import { PlayerWeaponWithRelationsSchema, playerWeaponSubRelations } from "./playerWeapon";
import { PlayerArmorWithRelationsSchema, playerArmorSubRelations } from "./playerArmor";
import { PlayerOptionWithRelationsSchema, playerOptionSubRelations } from "./playerOption";
import { PlayerSpecialWithRelationsSchema, playerSpecialSubRelations } from "./playerSpecial";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod/v4";
import {
  AvatarSchema,
  CharacterSchema,
  ConsumableSchema,
  ComboSchema,
  CharacterSkillSchema,
  StatisticSchema,
} from "@db/generated/zod/index";
import { characterSkillSubRelations, CharacterSkillWithRelationsSchema } from "./characterSkill";
import { ComboWithRelationsSchema } from "./combo";
import { defineRelations, makeRelations } from "./subRelationFactory";
import { StatisticWithRelationsSchema } from "./statistic";

// 1. 类型定义
export type Character = Selectable<character>;
export type CharacterInsert = Insertable<character>;
export type CharacterUpdate = Updateable<character>;

// 2. 关联查询定义
const characterSubRelationDefs = defineRelations({
  avatars: {
    build: (eb: ExpressionBuilder<DB, "character">, id: Expression<string>) =>
      jsonArrayFrom(
        eb
          .selectFrom("_avatarTocharacter")
          .innerJoin("avatar", "avatar.id", "_avatarTocharacter.A")
          .whereRef("_avatarTocharacter.B", "=", id)
          .selectAll("avatar"),
      )
        .$notNull()
        .as("avatars"),
    schema: z.array(AvatarSchema).describe("头像列表"),
  },
  consumables: {
    build: (eb: ExpressionBuilder<DB, "character">, id: Expression<string>) =>
      jsonArrayFrom(
        eb
          .selectFrom("_characterToconsumable")
          .innerJoin("consumable", "consumable.itemId", "_characterToconsumable.A")
          .innerJoin("character", "character.id", "_characterToconsumable.B")
          .whereRef("character.id", "=", id)
          .selectAll("consumable"),
      )
        .$notNull()
        .as("consumables"),
    schema: z.array(ConsumableSchema).describe("消耗品列表"),
  },
  combos: {
    build: (eb: ExpressionBuilder<DB, "character">, id: Expression<string>) =>
      jsonArrayFrom(
        eb
          .selectFrom("combo")
          .whereRef("combo.belongToCharacterId", "=", "character.id")
          .selectAll("combo")
          .select((subEb) => comboSubRelations(subEb, subEb.val("combo.id"))),
      )
        .$notNull()
        .as("combos"),
    schema: z.array(ComboSchema).describe("连击列表"),
  },
  skills: {
    build: (eb: ExpressionBuilder<DB, "character">, id: Expression<string>) =>
      jsonArrayFrom(
        eb
          .selectFrom("character_skill")
          .whereRef("character_skill.belongToCharacterId", "=", "character.id")
          .selectAll("character_skill")
          .select((subEb) => characterSkillSubRelations(subEb, subEb.val("character_skill.id"))),
      )
        .$notNull()
        .as("skills"),
    schema: z.array(CharacterSkillSchema).describe("技能列表"),
  },
  weapon: {
    build: (eb) =>
      jsonObjectFrom(
        eb
          .selectFrom("player_weapon")
          .whereRef("id", "=", "character.weaponId")
          .selectAll("player_weapon")
          .select((eb) => playerWeaponSubRelations(eb, eb.val("character.weaponId"))),
      )
        .$notNull()
        .as("weapon"),
    schema: PlayerWeaponWithRelationsSchema.describe("主武器"),
  },
  subWeapon: {
    build: (eb: ExpressionBuilder<DB, "character">, id: Expression<string>) =>
      jsonObjectFrom(
        eb
          .selectFrom("player_weapon")
          .whereRef("id", "=", "character.subWeaponId")
          .selectAll("player_weapon")
          .select((eb) => playerWeaponSubRelations(eb, eb.val("character.subWeaponId"))),
      )
        .$notNull()
        .as("subWeapon"),
    schema: PlayerWeaponWithRelationsSchema.describe("副武器"),
  },
  armor: {
    build: (eb: ExpressionBuilder<DB, "character">, id: Expression<string>) =>
      jsonObjectFrom(
        eb
          .selectFrom("player_armor")
          .whereRef("id", "=", "character.armorId")
          .selectAll("player_armor")
          .select((eb) => playerArmorSubRelations(eb, eb.val("character.armorId"))),
      )
        .$notNull()
        .as("armor"),
    schema: PlayerArmorWithRelationsSchema.describe("护甲"),
  },
  option: {
    build: (eb: ExpressionBuilder<DB, "character">, id: Expression<string>) =>
      jsonObjectFrom(
        eb
          .selectFrom("player_option")
          .whereRef("id", "=", "character.optionId")
          .selectAll("player_option")
          .select((eb) => playerOptionSubRelations(eb, eb.val("character.optionId"))),
      )
        .$notNull()
        .as("option"),
    schema: PlayerOptionWithRelationsSchema.describe("可选装备"),
  },
  special: {
    build: (eb: ExpressionBuilder<DB, "character">, id: Expression<string>) =>
      jsonObjectFrom(
        eb
          .selectFrom("player_special")
          .whereRef("id", "=", "character.specialId")
          .selectAll("player_special")
          .select((eb) => playerSpecialSubRelations(eb, eb.val("character.specialId"))),
      )
        .$notNull()
        .as("special"),
    schema: PlayerSpecialWithRelationsSchema.describe("特殊装备"),
  },
  statistic: {
    build: (eb: ExpressionBuilder<DB, "character">, id: Expression<string>) =>
      jsonObjectFrom(
        eb
          .selectFrom("statistic")
          .whereRef("id", "=", "character.statisticId")
          .selectAll("statistic")
          .select((subEb) => statisticSubRelations(subEb, subEb.val("statistic.id"))),
      )
        .$notNull()
        .as("statistic"),
    schema: StatisticSchema.describe("属性统计"),
  },
});

const characterRelationsFactory = makeRelations(characterSubRelationDefs);
export const CharacterWithRelationsSchema = z.object({
    ...CharacterSchema.shape,
  ...characterRelationsFactory.schema.shape,
});
export const characterSubRelations = characterRelationsFactory.subRelations;

// 3. 基础 CRUD 方法
export async function findCharacterById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return (await db.selectFrom("character").where("id", "=", id).selectAll("character").executeTakeFirst()) || null;
}

export async function insertCharacter(trx: Transaction<DB>, data: CharacterInsert) {
  return await trx.insertInto("character").values(data).returningAll().executeTakeFirstOrThrow();
}

export async function createCharacter(trx: Transaction<DB>, data: CharacterInsert) {
  const statistic = await createStatistic(trx);
  const character = await trx
    .insertInto("character")
    .values({
      ...data,
      id: data.id || createId(),
      statisticId: statistic.id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  return character;
}

export async function updateCharacter(trx: Transaction<DB>, id: string, data: CharacterUpdate) {
  return await trx.updateTable("character").set(data).where("id", "=", id).returningAll().executeTakeFirstOrThrow();
}

export async function deleteCharacter(trx: Transaction<DB>, id: string) {
  return (await trx.deleteFrom("character").where("id", "=", id).returningAll().executeTakeFirst()) || null;
}

// 4. 特殊查询方法
export async function findCharacterWithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("character")
    .where("id", "=", id)
    .selectAll("character")
    .select((eb) => characterSubRelations(eb, eb.val(id)))
    .executeTakeFirst();
}

export async function findCharactersByPlayerId(playerId: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("character")
    .innerJoin("player", "player.id", "character.belongToPlayerId")
    .where("player.id", "=", playerId)
    .selectAll("character")
    .execute();
}

// 关联查询类型
export type CharacterWithRelations = Awaited<ReturnType<typeof findCharacterWithRelations>>;
