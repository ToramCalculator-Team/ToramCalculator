import type { ExpressionBuilder, Transaction } from "kysely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import type { DB } from "../generated/zod/index";
import { getDB } from "./database";

/**
 * 引擎专用 simulator 查询（性能优先路径）。
 *
 * 背景：生成层的 selectSimulatorByIdWithRelations 无条件展开整棵关系树，
 * 产出 ~1.3MB SQL，Postgres 规划耗时 ~1.6s（执行仅 280ms）。本函数手写裁剪，
 * 只取引擎 loadScenario 真正消费的关系，砍掉 wiki 空分支（drops/item/recipe/task/npc/zone）。
 *
 * 关系树形（依据字段访问探针实测裁剪，叶子处只 selectAll）：
 *   simulator → teams(team[]) → members(member[])
 *     member.character →
 *        weapon/subWeapon/armor/option/special → crystals[] + template
 *        skills[] → template(skill) → variants[] → active/passive/registeredBehaviorTrees
 *        registlets[] → template(registlet)
 *        avatars[]、consumables[]、combos[] → content[]（保守保留）
 *     member.mob（浅取标量）；partner/mercenary 未实现，不取
 *   注：character/装备/crystal 的 cooking/modifiers 是 String[] 标量列，selectAll 已包含。
 *   与 src/lib/engine/core/engineScenarioSchema.ts 的 EngineSimulatorSchema 形状对齐。
 */

// crystals: M2M。每种装备的 join 表不同，crystal 在 A 列、装备在 B 列。
// kysely 列类型按表收窄，无法用联合类型泛化，故每种装备各写一个具体 builder。
const weaponCrystals = (eb: ExpressionBuilder<DB, "player_weapon">) =>
	jsonArrayFrom(
		eb
			.selectFrom("_crystalToplayer_weapon")
			.innerJoin("crystal", "_crystalToplayer_weapon.A", "crystal.itemId")
			.whereRef("_crystalToplayer_weapon.B", "=", "player_weapon.id")
			.selectAll("crystal"),
	).as("crystals");

const weaponTemplate = (eb: ExpressionBuilder<DB, "player_weapon">) =>
	jsonObjectFrom(
		eb.selectFrom("weapon").whereRef("weapon.itemId", "=", "player_weapon.templateId").selectAll("weapon"),
	).as("template");

const armorCrystals = (eb: ExpressionBuilder<DB, "player_armor">) =>
	jsonArrayFrom(
		eb
			.selectFrom("_crystalToplayer_armor")
			.innerJoin("crystal", "_crystalToplayer_armor.A", "crystal.itemId")
			.whereRef("_crystalToplayer_armor.B", "=", "player_armor.id")
			.selectAll("crystal"),
	).as("crystals");

const armorTemplate = (eb: ExpressionBuilder<DB, "player_armor">) =>
	jsonObjectFrom(eb.selectFrom("armor").whereRef("armor.itemId", "=", "player_armor.templateId").selectAll("armor")).as(
		"template",
	);

const optionCrystals = (eb: ExpressionBuilder<DB, "player_option">) =>
	jsonArrayFrom(
		eb
			.selectFrom("_crystalToplayer_option")
			.innerJoin("crystal", "_crystalToplayer_option.A", "crystal.itemId")
			.whereRef("_crystalToplayer_option.B", "=", "player_option.id")
			.selectAll("crystal"),
	).as("crystals");

const optionTemplate = (eb: ExpressionBuilder<DB, "player_option">) =>
	jsonObjectFrom(
		eb.selectFrom("option").whereRef("option.itemId", "=", "player_option.templateId").selectAll("option"),
	).as("template");

const specialCrystals = (eb: ExpressionBuilder<DB, "player_special">) =>
	jsonArrayFrom(
		eb
			.selectFrom("_crystalToplayer_special")
			.innerJoin("crystal", "_crystalToplayer_special.A", "crystal.itemId")
			.whereRef("_crystalToplayer_special.B", "=", "player_special.id")
			.selectAll("crystal"),
	).as("crystals");

const specialTemplate = (eb: ExpressionBuilder<DB, "player_special">) =>
	jsonObjectFrom(
		eb.selectFrom("special").whereRef("special.itemId", "=", "player_special.templateId").selectAll("special"),
	).as("template");

// character 子树：装备(各含 crystals[]) + avatars/skills/registlets/consumables/combos
// skills 深展开：character_skill → template(skill) → variants[] → 三类 behaviorTree
const skillVariants = (eb: ExpressionBuilder<DB, "skill">) =>
	jsonArrayFrom(
		eb
			.selectFrom("skill_variant")
			.whereRef("skill_variant.belongToskillId", "=", "skill.id")
			.selectAll("skill_variant")
			.select((v) => [
				jsonObjectFrom(
					v
						.selectFrom("behavior_tree")
						.whereRef("behavior_tree.activeOwnerId", "=", "skill_variant.id")
						.selectAll("behavior_tree"),
				).as("activeBehaviorTree"),
				jsonObjectFrom(
					v
						.selectFrom("behavior_tree")
						.whereRef("behavior_tree.passiveOwnerId", "=", "skill_variant.id")
						.selectAll("behavior_tree"),
				).as("passiveBehaviorTree"),
				jsonArrayFrom(
					v
						.selectFrom("behavior_tree")
						.whereRef("behavior_tree.registeredOwnerId", "=", "skill_variant.id")
						.selectAll("behavior_tree"),
				).as("registeredBehaviorTrees"),
			]),
	).as("variants");

const skillsOf = (eb: ExpressionBuilder<DB, "character">) =>
	jsonArrayFrom(
		eb
			.selectFrom("character_skill")
			.whereRef("character_skill.belongToCharacterId", "=", "character.id")
			.selectAll("character_skill")
			.select((s) => [
				jsonObjectFrom(
					s
						.selectFrom("skill")
						.whereRef("skill.id", "=", "character_skill.templateId")
						.selectAll("skill")
						.select((sk) => skillVariants(sk)),
				)
					.$notNull()
					.as("template"),
			]),
	).as("skills");

const registletsOf = (eb: ExpressionBuilder<DB, "character">) =>
	jsonArrayFrom(
		eb
			.selectFrom("character_registlet")
			.whereRef("character_registlet.belongToCharacterId", "=", "character.id")
			.selectAll("character_registlet")
			.select((r) => [
				// template 可空：内置托环在 wiki registlet 表无对应行，引擎走内置表解析，不依赖此 join。
				jsonObjectFrom(
					r
						.selectFrom("registlet")
						.whereRef("registlet.id", "=", "character_registlet.templateId")
						.selectAll("registlet"),
				).as("template"),
			]),
	).as("registlets");

const combosOf = (eb: ExpressionBuilder<DB, "character">) =>
	jsonArrayFrom(
		eb
			.selectFrom("combo")
			.whereRef("combo.belongToCharacterId", "=", "character.id")
			.selectAll("combo")
			.select((c) => [
				jsonArrayFrom(
					c.selectFrom("combo_step").whereRef("combo_step.belongToComboId", "=", "combo.id").selectAll("combo_step"),
				).as("content"),
			]),
	).as("combos");

const characterOf = (eb: ExpressionBuilder<DB, "member">) =>
	jsonObjectFrom(
		eb
			.selectFrom("character")
			.whereRef("character.id", "=", "member.characterId")
			.selectAll("character")
			.select((eb2) => [
				jsonObjectFrom(
					eb2
						.selectFrom("player_weapon")
						.whereRef("player_weapon.id", "=", "character.weaponId")
						.selectAll("player_weapon")
						.select((e) => [weaponCrystals(e), weaponTemplate(e)]),
				).as("weapon"),
				jsonObjectFrom(
					eb2
						.selectFrom("player_weapon")
						.whereRef("player_weapon.id", "=", "character.subWeaponId")
						.selectAll("player_weapon")
						.select((e) => [weaponCrystals(e), weaponTemplate(e)]),
				).as("subWeapon"),
				jsonObjectFrom(
					eb2
						.selectFrom("player_armor")
						.whereRef("player_armor.id", "=", "character.armorId")
						.selectAll("player_armor")
						.select((e) => [armorCrystals(e), armorTemplate(e)]),
				).as("armor"),
				jsonObjectFrom(
					eb2
						.selectFrom("player_option")
						.whereRef("player_option.id", "=", "character.optionId")
						.selectAll("player_option")
						.select((e) => [optionCrystals(e), optionTemplate(e)]),
				).as("option"),
				jsonObjectFrom(
					eb2
						.selectFrom("player_special")
						.whereRef("player_special.id", "=", "character.specialId")
						.selectAll("player_special")
						.select((e) => [specialCrystals(e), specialTemplate(e)]),
				).as("special"),
				jsonArrayFrom(
					eb2
						.selectFrom("_avatarTocharacter")
						.innerJoin("avatar", "_avatarTocharacter.A", "avatar.id")
						.whereRef("_avatarTocharacter.B", "=", "character.id")
						.selectAll("avatar"),
				).as("avatars"),
				skillsOf(eb2),
				registletsOf(eb2),
				jsonArrayFrom(
					eb2
						.selectFrom("_characterToconsumable")
						.innerJoin("consumable", "_characterToconsumable.B", "consumable.itemId")
						.whereRef("_characterToconsumable.A", "=", "character.id")
						.selectAll("consumable"),
				).as("consumables"),
				combosOf(eb2),
			]),
	).as("character");

// member 子树：character(深) + mob(浅取)；partner/mercenary 运行时尚未实现。
const membersOf = (eb: ExpressionBuilder<DB, "team">) =>
	jsonArrayFrom(
		eb
			.selectFrom("member")
			.whereRef("member.belongToTeamId", "=", "team.id")
			.selectAll("member")
			.select((eb2) => [
				characterOf(eb2),
				jsonObjectFrom(eb2.selectFrom("mob").whereRef("mob.id", "=", "member.mobId").selectAll("mob")).as("mob"),
			]),
	).as("members");
const teamsOf = (eb: ExpressionBuilder<DB, "simulator">) =>
	jsonArrayFrom(
		eb
			.selectFrom("team")
			.whereRef("team.belongToSimulatorId", "=", "simulator.id")
			.selectAll("team")
			.select((eb2) => membersOf(eb2)),
	).as("teams");

const analysisMembersOf = (
	eb: ExpressionBuilder<DB, "simulator">,
	table: "_simulatorAnalysisSources" | "_simulatorAnalysisTargets",
	alias: "analysisSourceMembers" | "analysisTargetMembers",
) =>
	jsonArrayFrom(
		eb
			.selectFrom(table)
			.innerJoin("member", `${table}.A`, "member.id")
			.whereRef(`${table}.B`, "=", "simulator.id")
			.select("member.id"),
	).as(alias);

/**
 * 引擎专用：按 id 取裁剪后的 simulator 关系树。
 * 返回结构与引擎消费面对齐；不含 wiki 空分支，规划成本远低于全展开版本。
 */
export async function selectSimulatorForEngine(id: string, trx?: Transaction<DB>) {
	const db = trx || (await getDB());
	return await db
		.selectFrom("simulator")
		.where("simulator.id", "=", id)
		.selectAll("simulator")
		.select((eb) => [
			teamsOf(eb),
			analysisMembersOf(eb, "_simulatorAnalysisSources", "analysisSourceMembers"),
			analysisMembersOf(eb, "_simulatorAnalysisTargets", "analysisTargetMembers"),
		])
		.executeTakeFirst();
}
