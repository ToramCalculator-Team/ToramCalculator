import { defaultData } from "@db/defaultData";
import { type Character, insertCharacterQuery } from "@db/generated/repositories/character";
import { updatePlayerQuery } from "@db/generated/repositories/player";
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
		const character = await insertCharacterQuery(trx, {
			...defaultData.character,
			id: createId(),
			belongToPlayerId: player.id,
		}).executeTakeFirstOrThrow();
		await updatePlayerQuery(trx, player.id, {
			useIn: character.id,
		}).executeTakeFirstOrThrow();
		console.log("已创建机体：", character);
		await hydrateSessionAccountStore(account, trx);
		return character;
	});
};
