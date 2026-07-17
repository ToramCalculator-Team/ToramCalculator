import {
	type CharacterWithRelations,
	CharacterWithRelationsSchema,
	characterSubRelations,
} from "@db/generated/repositories/character";
import {
	type PlayerArmorWithRelations,
	PlayerArmorWithRelationsSchema,
	playerArmorSubRelations,
} from "@db/generated/repositories/player_armor";
import {
	type PlayerOptionWithRelations,
	PlayerOptionWithRelationsSchema,
	playerOptionSubRelations,
} from "@db/generated/repositories/player_option";
import {
	type PlayerSpecialWithRelations,
	PlayerSpecialWithRelationsSchema,
	playerSpecialSubRelations,
} from "@db/generated/repositories/player_special";
import {
	type PlayerWeaponWithRelations,
	PlayerWeaponWithRelationsSchema,
	playerWeaponSubRelations,
} from "@db/generated/repositories/player_weapon";
import { CharacterSchema, type DB, PlayerSchema } from "@db/generated/zod/index";
import type { Kysely } from "kysely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { z } from "zod/v4";

export type CharacterAggregateIdentity = {
	playerId: string;
	characterId: string;
};

export const CharacterAggregateRowSchema = z.object({
	...CharacterWithRelationsSchema.shape,
	player: PlayerSchema,
	characters: z.array(CharacterSchema),
	weapons: z.array(PlayerWeaponWithRelationsSchema),
	armors: z.array(PlayerArmorWithRelationsSchema),
	options: z.array(PlayerOptionWithRelationsSchema),
	specials: z.array(PlayerSpecialWithRelationsSchema),
});
export type CharacterAggregateRow = z.output<typeof CharacterAggregateRowSchema>;

export type CharacterLiveAggregate = {
	player: z.output<typeof PlayerSchema>;
	character: CharacterWithRelations;
	characters: z.output<typeof CharacterSchema>[];
	assets: {
		weapons: PlayerWeaponWithRelations[];
		armors: PlayerArmorWithRelations[];
		options: PlayerOptionWithRelations[];
		specials: PlayerSpecialWithRelations[];
		weaponsById: Record<string, PlayerWeaponWithRelations>;
		armorsById: Record<string, PlayerArmorWithRelations>;
		optionsById: Record<string, PlayerOptionWithRelations>;
		specialsById: Record<string, PlayerSpecialWithRelations>;
	};
	relations: {
		skillsById: Record<string, CharacterWithRelations["skills"][number]>;
		registletsById: Record<string, CharacterWithRelations["registlets"][number]>;
		combosById: Record<string, CharacterWithRelations["combos"][number]>;
		consumablesById: Record<string, CharacterWithRelations["consumables"][number]>;
	};
};

const byIdentity = <T>(rows: readonly T[], identity: (row: T) => string): T[] =>
	[...rows].sort((left, right) => identity(left).localeCompare(identity(right)));

const indexBy = <T>(rows: readonly T[], identity: (row: T) => string): Record<string, T> =>
	Object.fromEntries(rows.map((row) => [identity(row), row]));

const normalizeWeapon = (weapon: PlayerWeaponWithRelations): PlayerWeaponWithRelations => ({
	...weapon,
	crystals: byIdentity(weapon.crystals, (crystal) => crystal.itemId),
});

const normalizeArmor = (armor: PlayerArmorWithRelations): PlayerArmorWithRelations => ({
	...armor,
	crystals: byIdentity(armor.crystals, (crystal) => crystal.itemId),
});

const normalizeOption = (option: PlayerOptionWithRelations): PlayerOptionWithRelations => ({
	...option,
	crystals: byIdentity(option.crystals, (crystal) => crystal.itemId),
});

const normalizeSpecial = (special: PlayerSpecialWithRelations): PlayerSpecialWithRelations => ({
	...special,
	crystals: byIdentity(special.crystals, (crystal) => crystal.itemId),
});

const normalizeCharacter = (character: CharacterWithRelations): CharacterWithRelations => ({
	...character,
	weapon: character.weapon ? normalizeWeapon(character.weapon) : null,
	subWeapon: character.subWeapon ? normalizeWeapon(character.subWeapon) : null,
	armor: character.armor ? normalizeArmor(character.armor) : null,
	option: character.option ? normalizeOption(character.option) : null,
	special: character.special ? normalizeSpecial(character.special) : null,
	avatars: byIdentity(character.avatars, (avatar) => avatar.id),
	skills: byIdentity(
		character.skills.map((skill) => ({
			...skill,
			template: {
				...skill.template,
				variants: byIdentity(skill.template.variants, (variant) => variant.id),
			},
		})),
		(skill) => skill.id,
	),
	registlets: byIdentity(character.registlets, (registlet) => registlet.id),
	consumables: byIdentity(character.consumables, (consumable) => consumable.itemId),
	combos: byIdentity(
		character.combos.map((combo) => ({ ...combo, content: byIdentity(combo.content, (step) => step.id) })),
		(combo) => combo.id,
	),
});

/**
 * 为一个正式 Character 构造唯一的 scoped aggregate 查询。
 * 当前 Character 使用完整关系，账号内其他 Character 只保留基础摘要，避免无关深关系扩大失效范围。
 */
export function selectCharacterAggregateQuery(db: Kysely<DB>, identity: CharacterAggregateIdentity) {
	return db
		.selectFrom("character")
		.where("character.id", "=", identity.characterId)
		.where("character.belongToPlayerId", "=", identity.playerId)
		.selectAll("character")
		.select((eb) => [
			...characterSubRelations(eb, eb.ref("character.id")),
			jsonObjectFrom(eb.selectFrom("player").where("player.id", "=", identity.playerId).selectAll("player"))
				.$notNull()
				.as("player"),
			jsonArrayFrom(
				eb
					.selectFrom("character as character_summary")
					.where("character_summary.belongToPlayerId", "=", identity.playerId)
					.selectAll("character_summary"),
			).as("characters"),
			jsonArrayFrom(
				eb
					.selectFrom("player_weapon")
					.where("player_weapon.belongToPlayerId", "=", identity.playerId)
					.selectAll("player_weapon")
					.select((assetEb) => playerWeaponSubRelations(assetEb, assetEb.ref("player_weapon.id"))),
			).as("weapons"),
			jsonArrayFrom(
				eb
					.selectFrom("player_armor")
					.where("player_armor.belongToPlayerId", "=", identity.playerId)
					.selectAll("player_armor")
					.select((assetEb) => playerArmorSubRelations(assetEb, assetEb.ref("player_armor.id"))),
			).as("armors"),
			jsonArrayFrom(
				eb
					.selectFrom("player_option")
					.where("player_option.belongToPlayerId", "=", identity.playerId)
					.selectAll("player_option")
					.select((assetEb) => playerOptionSubRelations(assetEb, assetEb.ref("player_option.id"))),
			).as("options"),
			jsonArrayFrom(
				eb
					.selectFrom("player_special")
					.where("player_special.belongToPlayerId", "=", identity.playerId)
					.selectAll("player_special")
					.select((assetEb) => playerSpecialSubRelations(assetEb, assetEb.ref("player_special.id"))),
			).as("specials"),
		]);
}

/** 解析并规范化当前 Character 的单行领域聚合。 */
export function parseCharacterAggregateRows(rows: readonly unknown[]): CharacterLiveAggregate | null {
	if (rows.length === 0) return null;
	if (rows.length !== 1) throw new Error(`Character aggregate expected one row, received ${rows.length}`);
	const row = CharacterAggregateRowSchema.parse(rows[0]);
	const character = normalizeCharacter(CharacterWithRelationsSchema.parse(row));
	const characters = byIdentity(row.characters, (candidate) => candidate.id);
	const weapons = byIdentity(row.weapons.map(normalizeWeapon), (asset) => asset.id);
	const armors = byIdentity(row.armors.map(normalizeArmor), (asset) => asset.id);
	const options = byIdentity(row.options.map(normalizeOption), (asset) => asset.id);
	const specials = byIdentity(row.specials.map(normalizeSpecial), (asset) => asset.id);

	const aggregate: CharacterLiveAggregate = {
		player: row.player,
		character,
		characters,
		assets: {
			weapons,
			armors,
			options,
			specials,
			weaponsById: indexBy(weapons, (asset) => asset.id),
			armorsById: indexBy(armors, (asset) => asset.id),
			optionsById: indexBy(options, (asset) => asset.id),
			specialsById: indexBy(specials, (asset) => asset.id),
		},
		relations: {
			skillsById: indexBy(character.skills, (skill) => skill.id),
			registletsById: indexBy(character.registlets, (registlet) => registlet.id),
			combosById: indexBy(character.combos, (combo) => combo.id),
			consumablesById: indexBy(character.consumables, (consumable) => consumable.itemId),
		},
	};
	return aggregate;
}

export function characterAggregateSignature(aggregate: CharacterLiveAggregate | null): string {
	return JSON.stringify(aggregate);
}
