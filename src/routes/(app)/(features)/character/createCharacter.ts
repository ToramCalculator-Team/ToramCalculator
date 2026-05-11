import { defaultData } from "@db/defaultData";
import { type Character, insertCharacter } from "@db/generated/repositories/character";
import { insertCharacterSkill } from "@db/generated/repositories/character_skill";
import { updatePlayer } from "@db/generated/repositories/player";
import { insertSkill } from "@db/generated/repositories/skill";
import { insertSkillVariant } from "@db/generated/repositories/skill_variant";
import { insertStatistic } from "@db/generated/repositories/statistic";
import type { Account } from "@db/repositories/account";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import { ensureAccountPlayer } from "~/session/accountPlayer";
import { hydrateSessionAccountStore } from "~/session/sessionAccountStore";
import { ensureTemporaryAccount } from "~/session/temporaryAccount";

// 根据当前账户创建角色
export const createCharacter = async (): Promise<Character> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const account: Account = await ensureTemporaryAccount(trx);
		console.log("account", account);
		// 设计说明：player 由账号上下文保证存在，创建机体只负责挂载 character 图谱。
		const player = await ensureAccountPlayer(account.id, trx);
		console.log("player", player);
		const characterStatistic = await insertStatistic(
			{
				...defaultData.statistic,
				id: createId(),
			},
			trx,
		);
		const skillStatistic = await insertStatistic(
			{
				...defaultData.statistic,
				id: createId(),
			},
			trx,
		);
		const skill = await insertSkill(
			{
				...defaultData.skill,
				id: createId(),
				statisticId: skillStatistic.id,
			},
			trx,
		);
		await insertSkillVariant(
			{
				...defaultData.skill_variant,
				id: createId(),
				belongToskillId: skill.id,
			},
			trx,
		);
		const character = await insertCharacter(
			{
				...defaultData.character,
				id: createId(),
				belongToPlayerId: player.id,
				statisticId: characterStatistic.id,
			},
			trx,
		);
		await insertCharacterSkill(
			{
				...defaultData.character_skill,
				id: createId(),
				belongToCharacterId: character.id,
				templateId: skill.id,
			},
			trx,
		);
		await updatePlayer(
			player.id,
			{
				useIn: character.id,
			},
			trx,
		);
		console.log("character", character);
		await hydrateSessionAccountStore(account, trx);
		return character;
	});
};
