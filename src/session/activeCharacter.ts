import { type Character, selectAllCharactersByBelongtoplayerid } from "@db/generated/repositories/character";
import type { Player } from "@db/generated/repositories/player";
import type { DB } from "@db/generated/zod/index";
import { findAccountById } from "@db/repositories/account";
import type { Transaction } from "kysely";
import { ensureAccountPlayer } from "./accountPlayer";

export type AccountCharacterContext = {
	player: Player;
	character: Character | null;
};

const sortById = <T extends { id: string }>(rows: T[]): T[] => {
	return [...rows].sort((left, right) => left.id.localeCompare(right.id));
};

export async function resolvePlayerActiveCharacter(player: Player, trx?: Transaction<DB>): Promise<Character | null> {
	const characters = await selectAllCharactersByBelongtoplayerid(player.id, trx);
	if (characters.length === 0) return null;

	const activeCharacter = player.useIn ? characters.find((candidate) => candidate.id === player.useIn) : undefined;
	return activeCharacter ?? sortById(characters)[0] ?? null;
}

export async function resolveAccountActiveCharacter(
	accountId: string,
	trx?: Transaction<DB>,
): Promise<AccountCharacterContext | null> {
	const account = await findAccountById(accountId, trx);
	if (!account) return null;

	const player = await ensureAccountPlayer(accountId, trx);
	const character = await resolvePlayerActiveCharacter(player, trx);
	return { player, character };
}
