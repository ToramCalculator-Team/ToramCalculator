import type { DB } from "@db/generated/zod/index";
import { type Account, createAccount, findAccountById } from "@db/repositories/account";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import { sql, type Transaction } from "kysely";
import { setStore, store } from "~/store";

/**
 * 确保本地存在临时账户
 * 如果 store 中没有 accountId，则创建一个新的临时账户
 * @returns Promise<string> 返回账户ID
 */
export async function ensureLocalAccount(trx?: Transaction<DB>): Promise<Account> {
	const isBrowser = typeof window !== "undefined";
	if (!isBrowser) {
		throw new Error("ensureLocalAccount 只能在浏览器环境中调用");
	}

	// 检查 store 是否已有 accountId
	let accountId = store.session.account.id;
	let account: Account;

	if (!accountId) {
		// 创建新的临时账户
		accountId = createId();
		setStore("session", "account", {
			id: accountId,
			type: "User",
		});

		// 在数据库中创建账户记录
		account = await createAccount(
			{
				id: accountId,
				type: "User",
				provider: "local",
				providerAccountId: accountId,
			},
			trx,
		);

		console.log("创建本地临时账户:", account);
	} else {
		// 验证账户是否存在于数据库中
		const existingAccount = await findAccountById(accountId, trx);
		if (!existingAccount) {
			// 如果数据库中没有该账户，重新创建
			account = await createAccount(
				{
					id: accountId,
					type: "User",
					provider: "local",
					providerAccountId: accountId,
				},
				trx,
			);

			console.log("重新创建本地临时账户:", account);
		} else {
			account = existingAccount;
		}
	}

	return account;
}

/**
 * 将本地账户绑定到用户
 * @param accountId 账户ID
 * @param userId 用户ID
 */
export async function bindLocalAccountToUser(accountId: string, userId: string): Promise<void> {
	const db = await getDB();
	await db.updateTable("account").set({ userId }).where("id", "=", accountId).execute();

	console.log(`账户 ${accountId} 已绑定到用户 ${userId}`);
}

/**
 * 清除changes内容
 */
export async function clearChangesContent(): Promise<void> {
	const db = await getDB();
	await sql`DELETE FROM changes`.execute(db);

	console.log("清除changes内容");
}
