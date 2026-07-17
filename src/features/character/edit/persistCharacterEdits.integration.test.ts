import { readFileSync } from "node:fs";
import { defaultData } from "@db/defaultData";
import type { DB } from "@db/generated/zod/index";
import { PGliteDialect } from "@db/repositories/dialect/dialect";
import { PGlite } from "@electric-sql/pglite";
import type { PGliteWorker } from "@electric-sql/pglite/worker";
import { Kysely } from "kysely";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { persistCharacterEditBatch } from "./persistCharacterEdits";

const CLIENT_SQL_URL = new URL("../../../../db/generated/client.sql", import.meta.url);
const PLAYER_ID = "persist-edits-player";

let pglite: PGlite;
let db: Kysely<DB>;

const createCharacter = async (id: string) => {
	const statisticId = `${id}-statistic`;
	await db
		.insertInto("statistic")
		.values({ ...defaultData.statistic, id: statisticId })
		.execute();
	await db
		.insertInto("character")
		.values({
			...defaultData.character,
			id,
			name: id,
			belongToPlayerId: PLAYER_ID,
			statisticId,
		})
		.execute();
};

const countCharacterChanges = async (characterId: string): Promise<number> => {
	const result = await pglite.query<{ count: number }>(
		`SELECT COUNT(*)::integer AS count FROM changes WHERE table_name = 'character' AND value->>'id' = $1`,
		[characterId],
	);
	return result.rows[0]?.count ?? 0;
};

beforeAll(async () => {
	pglite = new PGlite();
	await pglite.exec(readFileSync(CLIENT_SQL_URL, "utf-8"));
	// 项目 dialect 只依赖 query()；测试内的 PGlite 与 Worker 代理具有同一最小执行接口。
	const workerCompatiblePGlite = pglite as unknown as PGliteWorker;
	db = new Kysely<DB>({ dialect: new PGliteDialect(workerCompatiblePGlite) });
	await db
		.insertInto("player")
		.values({ ...defaultData.player, id: PLAYER_ID })
		.execute();
}, 120_000);

afterAll(async () => {
	await db.destroy();
	await pglite.close();
});

describe("persistCharacterEditBatch", () => {
	it("在同一事务内顺序解释两个快速相对调整", async () => {
		const characterId = "persist-adjust-twice";
		await createCharacter(characterId);

		await persistCharacterEditBatch(db, characterId, [
			{ type: "character.numeric.adjust", field: "str", delta: 1 },
			{ type: "character.numeric.adjust", field: "str", delta: 1 },
		]);

		const character = await db
			.selectFrom("character")
			.where("id", "=", characterId)
			.select("str")
			.executeTakeFirstOrThrow();
		expect(character.str).toBe(3);
	});

	it("保持绝对设置和相对调整的接收顺序", async () => {
		const characterId = "persist-mixed-order";
		await createCharacter(characterId);

		await persistCharacterEditBatch(db, characterId, [
			{ type: "character.numeric.set", field: "str", value: 10 },
			{ type: "character.numeric.adjust", field: "str", delta: 1 },
			{ type: "character.numeric.set", field: "str", value: 4 },
			{ type: "character.numeric.adjust", field: "str", delta: -1 },
		]);

		const character = await db
			.selectFrom("character")
			.where("id", "=", characterId)
			.select("str")
			.executeTakeFirstOrThrow();
		expect(character.str).toBe(3);
	});

	it("边界饱和且结果未变化时不产生空写", async () => {
		const characterId = "persist-boundary-noop";
		await createCharacter(characterId);
		const before = await countCharacterChanges(characterId);

		await persistCharacterEditBatch(db, characterId, [
			{ type: "character.numeric.adjust", field: "str", delta: -1 },
			{ type: "character.numeric.adjust", field: "personalityValue", delta: 1 },
		]);

		expect(await countCharacterChanges(characterId)).toBe(before);
	});

	it("个人能力类型变更同步维护个人能力值", async () => {
		const characterId = "persist-personality";
		await createCharacter(characterId);

		await persistCharacterEditBatch(db, characterId, [
			{ type: "character.personality.setType", value: "Luk" },
			{ type: "character.numeric.adjust", field: "personalityValue", delta: 1 },
		]);
		let character = await db
			.selectFrom("character")
			.where("id", "=", characterId)
			.select(["personalityType", "personalityValue"])
			.executeTakeFirstOrThrow();
		expect(character).toEqual({ personalityType: "Luk", personalityValue: 2 });

		await persistCharacterEditBatch(db, characterId, [
			{ type: "character.personality.setType", value: "None" },
			{ type: "character.numeric.set", field: "personalityValue", value: 99 },
		]);
		character = await db
			.selectFrom("character")
			.where("id", "=", characterId)
			.select(["personalityType", "personalityValue"])
			.executeTakeFirstOrThrow();
		expect(character).toEqual({ personalityType: "None", personalityValue: 0 });
	});

	it("技能与数值操作混合时按操作流分段读取事务内最新状态", async () => {
		const characterId = "persist-skill-field-order";
		const skillId = "persist-skill-template";
		await createCharacter(characterId);
		await db
			.insertInto("statistic")
			.values({ ...defaultData.statistic, id: "persist-skill-statistic" })
			.execute();
		await db
			.insertInto("skill")
			.values({ ...defaultData.skill, id: skillId, statisticId: "persist-skill-statistic" })
			.execute();

		await persistCharacterEditBatch(
			db,
			characterId,
			[
				{ type: "skills.adjustLevel", templateId: skillId, delta: 1 },
				{ type: "character.numeric.adjust", field: "str", delta: 1 },
				{ type: "skills.adjustLevel", templateId: skillId, delta: 1 },
			],
			() => "persist-character-skill",
		);

		const character = await db
			.selectFrom("character")
			.where("id", "=", characterId)
			.select("str")
			.executeTakeFirstOrThrow();
		const characterSkill = await db
			.selectFrom("character_skill")
			.where("belongToCharacterId", "=", characterId)
			.where("templateId", "=", skillId)
			.select("lv")
			.executeTakeFirstOrThrow();
		expect(character.str).toBe(2);
		expect(characterSkill.lv).toBe(2);
	});

	it("任一操作失败时整批回滚，包括已生成的 outbox 记录", async () => {
		const characterId = "persist-rollback";
		await createCharacter(characterId);
		const beforeChanges = await countCharacterChanges(characterId);

		await expect(
			persistCharacterEditBatch(db, characterId, [
				{ type: "character.fields.update", patch: { name: "should rollback" } },
				{ type: "character.numeric.set", field: "str", value: 10 },
				{ type: "character.numeric.set", field: "str", value: 1.5 },
			]),
		).rejects.toThrow("str 必须是有限整数");

		const character = await db
			.selectFrom("character")
			.where("id", "=", characterId)
			.select(["name", "str"])
			.executeTakeFirstOrThrow();
		expect(character).toEqual({ name: characterId, str: 1 });
		expect(await countCharacterChanges(characterId)).toBe(beforeChanges);
	});
});
