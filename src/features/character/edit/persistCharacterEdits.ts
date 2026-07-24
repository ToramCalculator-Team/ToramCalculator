import { updateCharacterQuery } from "@db/generated/repositories/character";
import {
	deleteCharacterSkillQuery,
	insertCharacterSkillQuery,
	updateCharacterSkillQuery,
} from "@db/generated/repositories/character_skill";
import type { character, DB } from "@db/generated/zod/index";
import { createId } from "@paralleldrive/cuid2";
import type { Kysely, Transaction } from "kysely";
import type { CharacterEdit, CharacterNumericField, CharacterSkillEdit } from "./characterEditProtocol";
import {
	adjustCharacterNumericValue,
	normalizeCharacterNumericValue,
	normalizePersonalityTypeChange,
} from "./characterNumericRules";
import { type CharacterSkillMutationPlan, planCharacterSkillMutations } from "./characterSkillRules";

const isCharacterSkillEdit = (edit: CharacterEdit): edit is CharacterSkillEdit => edit.type.startsWith("skills.");

async function persistCharacterSkillPlan(
	transaction: Transaction<DB>,
	characterId: string,
	plan: CharacterSkillMutationPlan,
	createCharacterSkillId: () => string,
): Promise<void> {
	if (plan.deletes.length > 0) {
		// combo_step 依赖 character_skill；同一事务先删除引用行，使服务端仍能按合法外键顺序重放。
		await transaction.deleteFrom("combo_step").where("characterSkillId", "in", plan.deletes).execute();
		for (const characterSkillId of plan.deletes) {
			await deleteCharacterSkillQuery(transaction, characterSkillId).executeTakeFirst();
		}
	}
	for (const update of plan.updates) {
		await updateCharacterSkillQuery(transaction, update.characterSkillId, { lv: update.lv }).executeTakeFirstOrThrow();
	}
	for (const insert of plan.inserts) {
		await insertCharacterSkillQuery(transaction, {
			id: createCharacterSkillId(),
			lv: insert.lv,
			isStarGem: false,
			templateId: insert.templateId,
			belongToCharacterId: characterId,
		}).executeTakeFirstOrThrow();
	}
}

async function updateNumericField(
	transaction: Transaction<DB>,
	characterId: string,
	current: character,
	field: CharacterNumericField,
	nextValue: number,
): Promise<void> {
	if (current[field] === nextValue) return;
	// 类型说明：field 已由 CharacterNumericField 白名单约束，计算属性只可能生成一个合法数值列 patch。
	const patch = { [field]: nextValue } as Pick<character, CharacterNumericField>;
	await updateCharacterQuery(transaction, characterId, patch).executeTakeFirstOrThrow();
	current[field] = nextValue;
}

/**
 * 在一个 PGlite 事务内按接收顺序解释机体配置操作。
 * 相对操作读取事务内最新工作状态；任何操作失败都会回滚整个批次，liveQuery 随后独立发布提交结果。
 */
export async function persistCharacterEditBatch(
	db: Kysely<DB>,
	characterId: string,
	edits: readonly CharacterEdit[],
	createCharacterSkillId: () => string = createId,
): Promise<void> {
	if (edits.length === 0) return;
	await db.transaction().execute(async (transaction) => {
		const current = await transaction
			.selectFrom("character")
			.where("id", "=", characterId)
			.selectAll()
			.executeTakeFirst();
		if (!current) throw new Error(`机体不存在: ${characterId}`);

		let pendingSkillEdits: CharacterSkillEdit[] = [];

		const flushSkillEdits = async () => {
			if (pendingSkillEdits.length === 0) return;
			const characterSkills = await transaction
				.selectFrom("character_skill")
				.where("belongToCharacterId", "=", characterId)
				.selectAll()
				.execute();
			const templates = await transaction.selectFrom("skill").selectAll().execute();
			const plan = planCharacterSkillMutations(pendingSkillEdits, characterSkills, templates);
			await persistCharacterSkillPlan(transaction, characterId, plan, createCharacterSkillId);
			pendingSkillEdits = [];
		};

		for (const edit of edits) {
			if (isCharacterSkillEdit(edit)) {
				pendingSkillEdits.push(edit);
				continue;
			}
			await flushSkillEdits();

			if (edit.type === "character.fields.update") {
				if (Object.keys(edit.patch).length === 0) continue;
				await updateCharacterQuery(transaction, characterId, edit.patch).executeTakeFirstOrThrow();
				Object.assign(current, edit.patch);
				continue;
			}
			if (edit.type === "character.personality.setType") {
				const next = normalizePersonalityTypeChange(current.personalityValue, edit.value);
				if (current.personalityType === next.personalityType && current.personalityValue === next.personalityValue) {
					continue;
				}
				await updateCharacterQuery(transaction, characterId, next).executeTakeFirstOrThrow();
				current.personalityType = next.personalityType;
				current.personalityValue = next.personalityValue;
				continue;
			}

			const nextValue =
				edit.type === "character.numeric.set"
					? normalizeCharacterNumericValue(edit.field, edit.value, current.personalityType)
					: adjustCharacterNumericValue(current, edit.field, edit.delta);
			await updateNumericField(transaction, characterId, current, edit.field, nextValue);
		}
		await flushSkillEdits();
	});
}
