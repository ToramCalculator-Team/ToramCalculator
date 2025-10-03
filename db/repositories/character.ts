import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, character } from "../generated/kysely/kysely";
import { createStatistic, statisticSubRelations } from "./statistic";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { comboSubRelations } from "./combo";
import { PlayerWeaponRelationsSchema, playerWeaponSubRelations } from "./playerWeapon";
import { PlayerArmorRelationsSchema, playerArmorSubRelations } from "./playerArmor";
import { PlayerOptionRelationsSchema, playerOptionSubRelations } from "./playerOption";
import { PlayerSpecialRelationsSchema, playerSpecialSubRelations } from "./playerSpecial";
import { createId } from "@paralleldrive/cuid2";
import { character_skillSubRelations } from "./characterSkill";
import { z } from "zod/v3";
import {
  avatarSchema,
  characterSchema,
  consumableSchema,
  comboSchema,
  character_skillSchema,
  statisticSchema,
} from "@db/generated/zod";
import { CharacterSkillRelationsSchema } from "./characterSkill";
import { ComboRelationsSchema } from "./combo";

// 1. 类型定义
export type Character = Selectable<character>;
export type CharacterInsert = Insertable<character>;
export type CharacterUpdate = Updateable<character>;
// 关联查询类型
export type CharacterWithRelations = Awaited<ReturnType<typeof findCharacterWithRelations>>;
export const CharacterRelationsSchema = z.object({
  ...characterSchema.shape,
  avatars: z.array(avatarSchema),
  consumables: z.array(consumableSchema),
  combos: z.array(ComboRelationsSchema),
  skills: z.array(CharacterSkillRelationsSchema),
  weapon: PlayerWeaponRelationsSchema,
  subWeapon: PlayerWeaponRelationsSchema,
  armor: PlayerArmorRelationsSchema,
  optEquip: PlayerOptionRelationsSchema,
  speEquip: PlayerSpecialRelationsSchema,
  statistic: statisticSchema,
});

// 2. 关联查询定义
export function characterSubRelations(eb: ExpressionBuilder<DB, "character">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_avatarTocharacter")
        .innerJoin("avatar", "avatar.id", "_avatarTocharacter.A")
        .whereRef("_avatarTocharacter.B", "=", id)
        .selectAll("avatar"),
    )
      .$notNull()
      .as("avatars"),
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
    jsonArrayFrom(
      eb
        .selectFrom("combo")
        .whereRef("combo.characterId", "=", "character.id")
        .selectAll("combo")
        .select((subEb) => comboSubRelations(subEb, subEb.val("combo.id"))),
    )
      .$notNull()
      .as("combos"),
    jsonArrayFrom(
      eb
        .selectFrom("character_skill")
        .whereRef("character_skill.characterId", "=", "character.id")
        .selectAll("character_skill")
        .select((subEb) => character_skillSubRelations(subEb, subEb.val("character_skill.id"))),
    )
      .$notNull()
      .as("skills"),
    jsonObjectFrom(
      eb
        .selectFrom("player_weapon")
        .whereRef("id", "=", "character.weaponId")
        .selectAll("player_weapon")
        .select((eb) => playerWeaponSubRelations(eb, eb.val("character.weaponId"))),
    )
      .$notNull()
      .as("weapon"),
    jsonObjectFrom(
      eb
        .selectFrom("player_weapon")
        .whereRef("id", "=", "character.subWeaponId")
        .selectAll("player_weapon")
        .select((eb) => playerWeaponSubRelations(eb, eb.val("character.subWeaponId"))),
    )
      .$notNull()
      .as("subWeapon"),
    jsonObjectFrom(
      eb
        .selectFrom("player_armor")
        .whereRef("id", "=", "character.armorId")
        .selectAll("player_armor")
        .select((eb) => playerArmorSubRelations(eb, eb.val("character.armorId"))),
    )
      .$notNull()
      .as("armor"),
    jsonObjectFrom(
      eb
        .selectFrom("player_option")
        .whereRef("id", "=", "character.optEquipId")
        .selectAll("player_option")
        .select((eb) => playerOptionSubRelations(eb, eb.val("character.optEquipId"))),
    )
      .$notNull()
      .as("optEquip"),
    jsonObjectFrom(
      eb
        .selectFrom("player_special")
        .whereRef("id", "=", "character.speEquipId")
        .selectAll("player_special")
        .select((eb) => playerSpecialSubRelations(eb, eb.val("character.speEquipId"))),
    )
      .$notNull()
      .as("speEquip"),
    jsonObjectFrom(
      eb
        .selectFrom("statistic")
        .whereRef("id", "=", "character.statisticId")
        .selectAll("statistic")
        .select((subEb) => statisticSubRelations(subEb, subEb.val("statistic.id"))),
    )
      .$notNull()
      .as("statistic"),
  ];
}

// 3. 基础 CRUD 方法
export async function findCharacterById(id: string): Promise<Character | null> {
  const db = await getDB();
  return (await db.selectFrom("character").where("id", "=", id).selectAll("character").executeTakeFirst()) || null;
}

export async function findCharacters(): Promise<Character[]> {
  const db = await getDB();
  return await db.selectFrom("character").selectAll("character").execute();
}

export async function insertCharacter(trx: Transaction<DB>, data: CharacterInsert): Promise<Character> {
  return await trx.insertInto("character").values(data).returningAll().executeTakeFirstOrThrow();
}

export async function createCharacter(trx: Transaction<DB>, data: CharacterInsert): Promise<Character> {
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

export async function updateCharacter(trx: Transaction<DB>, id: string, data: CharacterUpdate): Promise<Character> {
  return await trx.updateTable("character").set(data).where("id", "=", id).returningAll().executeTakeFirstOrThrow();
}

export async function deleteCharacter(trx: Transaction<DB>, id: string): Promise<Character | null> {
  return (await trx.deleteFrom("character").where("id", "=", id).returningAll().executeTakeFirst()) || null;
}

// 4. 特殊查询方法
export async function findCharacterWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("character")
    .where("id", "=", id)
    .selectAll("character")
    .select((eb) => characterSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}
