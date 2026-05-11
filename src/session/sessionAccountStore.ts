import type { DB } from "@db/generated/zod/index";
import type { Account } from "@db/repositories/account";
import type { Transaction } from "kysely";
import { setStore } from "~/store";
import { type AccountCharacterContext, resolveAccountActiveCharacter } from "./activeCharacter";

export type SessionAccountIdentity = Pick<Account, "id" | "type">;

export async function hydrateSessionAccountStore(
	account: SessionAccountIdentity,
	trx?: Transaction<DB>,
): Promise<AccountCharacterContext | null> {
	// 设计说明：store 只保存路由所需的最小会话索引，完整 player/character 数据仍由页面模型按需读取。
	const context = await resolveAccountActiveCharacter(account.id, trx);
	if (!context) {
		setStore("session", "account", {
			id: account.id,
			type: account.type,
			player: undefined,
		});
		return null;
	}

	setStore("session", "account", {
		id: account.id,
		type: account.type,
		player: context.character
			? {
					id: context.player.id,
					character: {
						id: context.character.id,
					},
				}
			: {
					id: context.player.id,
				},
	});

	return context;
}

export function clearSessionAccountStore(): void {
	setStore("session", "account", {
		id: "",
		type: "User",
		player: undefined,
	});
}
