import { store } from "~/store";
import { ensureLocalAccount } from "~/lib/localAccount";
import { selectPlayerById, selectAllPlayersByBelongtoaccountid } from "@db/generated/repositories/player";
import type { Transaction } from "kysely";
import type { DB } from "@db/generated/zod/index";
import type { Account } from "@db/repositories/account";
import type { Player } from "@db/generated/repositories/player";

/**
 * 用户上下文
 */
export interface UserContext {
	account: Account;
	player: Player | null;
}

/**
 * 获取当前用户上下文
 * 从 store 和数据库中获取 account 和 player 信息
 * @param trx 数据库事务
 * @returns 用户上下文
 */
export const getUserContext = async (trx: Transaction<DB>): Promise<UserContext> => {
	// 1. 确保账户存在
	const account = await ensureLocalAccount(trx);

	// 2. 获取 player
	let player: Player | null = null;

	if (store.session.account.player?.id) {
		// 从 LocalStorage 中获取 PlayerID，并查询数据库
		const res = await selectPlayerById(store.session.account.player.id, trx);
		if (res) {
			player = res;
		} else {
			console.warn("LocalStorage 中的 PlayerID 无效，未在数据库中找到对应的 Player");
		}
	} else {
		// 尝试从账户下查找第一个 player
		const players = await selectAllPlayersByBelongtoaccountid(account.id, trx);
		if (players.length > 0) {
			player = players[0];
		}
	}

	return { account, player };
};

/**
 * 确保当前用户有 player
 * 如果没有 player 则抛出错误
 * @param trx 数据库事务
 * @returns 用户上下文（保证 player 不为 null）
 */
export const ensureUserPlayer = async (
	trx: Transaction<DB>,
): Promise<Required<UserContext>> => {
	const context = await getUserContext(trx);

	if (!context.player) {
		throw new Error("当前用户没有 Player，请先创建 Player");
	}

	return context as Required<UserContext>;
};
