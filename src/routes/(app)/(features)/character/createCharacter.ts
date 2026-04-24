import { defaultData } from "@db/defaultData";
import { type Character, insertCharacter, updateCharacter } from "@db/generated/repositories/character";
import { insertCharacterSkill } from "@db/generated/repositories/character_skill";
import {
	insertPlayer,
	type Player,
	selectAllPlayersByBelongtoaccountid,
	selectPlayerById,
    updatePlayer,
} from "@db/generated/repositories/player";
import { insertSkill } from "@db/generated/repositories/skill";
import { insertSkillVariant } from "@db/generated/repositories/skill_variant";
import { insertStatistic } from "@db/generated/repositories/statistic";
import type { Account } from "@db/repositories/account";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import { ensureLocalAccount } from "~/lib/localAccount";
import { setStore, store } from "~/store";

// 根据本地账户创建角色
export const createCharacter = async (): Promise<Character> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		let account: Account;
		account = await ensureLocalAccount(trx);
		console.log("account", account);
		let player: Player;
		if (store.session.account.player?.id) {
			// 从LocalStorage中获取PlayerID，并查询数据库中是否存在对应的Player
			const res = await selectPlayerById(store.session.account.player.id, trx);
			if (res) {
				player = res;
			} else {
				throw new Error("LocalStorage中的PlayerID无效，未在数据库中找到对应的Player");
			}
		} else {
			const players = await selectAllPlayersByBelongtoaccountid(account.id, trx);
			if (players.length > 0) {
				// 账号存在多个角色时，默认使用第一个
				player = players[0];
			} else {
				// 账号不存在角色时，创建第一个角色
				player = await insertPlayer(
					{
						...defaultData.player,
						id: createId(),
						belongToAccountId: account.id,
					},
					trx,
				);
			}
		}
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
		const skillVariant = await insertSkillVariant(
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
		const character_skill = await insertCharacterSkill(
			{
				...defaultData.character_skill,
				id: createId(),
				belongToCharacterId: character.id,
				templateId: skill.id,
			},
			trx,
		);
		await updatePlayer(player.id, {
			useIn: character.id,
		}, trx);
		console.log("character", character);
		setStore("session", "account", "player", {
			id: player.id,
			character: {
				id: character.id,
			},
		});
		return character;
	});
};
