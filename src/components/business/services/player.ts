import { getDB } from "@db/repositories/database";
import { insertPlayer, updatePlayer, type Player } from "@db/generated/repositories/player";
import { defaultData } from "@db/defaultData";
import { createId } from "@paralleldrive/cuid2";
import { getUserContext } from "./context";
import { setStore } from "~/store";

/**
 * 创建新的 Player
 * @returns 创建的 Player
 */
export const createPlayer = async (): Promise<Player> => {
	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const { account } = await getUserContext(trx);

		const player = await insertPlayer(
			{
				...defaultData.player,
				id: createId(),
				belongToAccountId: account.id,
			},
			trx,
		);

		// 更新 store
		setStore("session", "account", "player", {
			id: player.id,
		});

		return player;
	});
};

/**
 * 更新 Player 的 useIn 字段
 * @param playerId Player ID
 * @param characterId Character ID
 */
export const setPlayerUseIn = async (playerId: string, characterId: string): Promise<void> => {
	const db = await getDB();
	await db.transaction().execute(async (trx) => {
		await updatePlayer(playerId, { useIn: characterId }, trx);
	});
};
