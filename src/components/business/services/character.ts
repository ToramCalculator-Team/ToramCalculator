import { getDB } from "@db/repositories/database";
import { insertCharacter, type Character } from "@db/generated/repositories/character";
import { insertPlayer } from "@db/generated/repositories/player";
import { insertStatistic } from "@db/generated/repositories/statistic";
import { updatePlayer } from "@db/generated/repositories/player";
import { defaultData } from "@db/defaultData";
import { createId } from "@paralleldrive/cuid2";
import { getUserContext } from "./context";
import { setStore } from "~/store";

/**
 * 创建新的 Character
 * 如果当前用户没有 Player，会自动创建一个
 * @returns 创建的 Character
 */
export const createCharacter = async (): Promise<Character> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		let { account, player } = await getUserContext(trx);

		// 如果没有 player，创建一个
		if (!player) {
			player = await insertPlayer(
				{
					...defaultData.player,
					id: createId(),
					belongToAccountId: account.id,
				},
				trx,
			);
		}

		// 创建统计记录
		const statistic = await insertStatistic(
			{
				...defaultData.statistic,
				id: createId(),
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
			trx,
		);

		// 创建 character
		const character = await insertCharacter(
			{
				...defaultData.character,
				id: createId(),
				belongToPlayerId: player.id,
				statisticId: statistic.id,
			},
			trx,
		);

		// 更新 player 的 useIn
		await updatePlayer(
			player.id,
			{
				useIn: character.id,
			},
			trx,
		);

		// 更新 store
		setStore("session", "account", "player", {
			id: player.id,
			character: {
				id: character.id,
			},
		});

		return character;
	});
};
