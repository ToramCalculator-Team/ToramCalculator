import { defaultData } from "@db/defaultData";
import { insertPlayer, type Player, selectAllPlayersByBelongtoaccountid } from "@db/generated/repositories/player";
import type { DB } from "@db/generated/zod/index";
import { findAccountById } from "@db/repositories/account";
import { createId } from "@paralleldrive/cuid2";
import type { Transaction } from "kysely";

const sortById = <T extends { id: string }>(rows: T[]): T[] => {
	return [...rows].sort((left, right) => left.id.localeCompare(right.id));
};

export async function selectFirstAccountPlayer(accountId: string, trx?: Transaction<DB>): Promise<Player | null> {
	const players = await selectAllPlayersByBelongtoaccountid(accountId, trx);
	return sortById(players)[0] ?? null;
}

export async function ensureAccountPlayer(accountId: string, trx?: Transaction<DB>): Promise<Player> {
	// 设计说明：account 是可登录身份，player 是角色资产归属根；缺失 player 时在这里补齐账号不变量。
	const account = await findAccountById(accountId, trx);
	if (!account) {
		throw new Error("当前账号尚未同步到本地数据库，无法创建 Player");
	}

	const existingPlayer = await selectFirstAccountPlayer(accountId, trx);
	if (existingPlayer) return existingPlayer;

	return await insertPlayer(
		{
			...defaultData.player,
			id: createId(),
			belongToAccountId: accountId,
		},
		trx,
	);
}
