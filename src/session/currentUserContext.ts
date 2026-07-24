import type { Player } from "@db/generated/repositories/player";
import type { DB } from "@db/generated/zod/index";
import type { Account } from "@db/repositories/account";
import type { RepositoryWriterContext } from "@db/repositories/repositoryWriter";
import type { Transaction } from "kysely";
import { ensureAccountPlayer } from "./accountPlayer";
import { ensureTemporaryAccount } from "./temporaryAccount";

export interface CurrentUserContext {
	account: Account;
	player: Player;
}

/** 将已准备完成的会话账号投影为 repository 写命令需要的最小身份。 */
export const toRepositoryWriterContext = (context: CurrentUserContext): RepositoryWriterContext => ({
	accountId: context.account.id,
	accountType: context.account.type,
});

/**
 * 获取当前业务写入上下文。
 *
 * 设计说明：业务表单写入需要稳定的 account/player 归属根；
 * account 由本地会话保证存在，player 由账号上下文保证存在。
 */
export const getCurrentUserContext = async (trx: Transaction<DB>): Promise<CurrentUserContext> => {
	const account = await ensureTemporaryAccount(trx);
	const player = await ensureAccountPlayer(account.id, trx);

	return { account, player };
};
