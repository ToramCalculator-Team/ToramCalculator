import { readFileSync } from "node:fs";
import { defaultData } from "@db/defaultData";
import type { DB } from "@db/generated/zod/index";
import { PGliteDialect } from "@db/repositories/dialect/dialect";
import { PGlite } from "@electric-sql/pglite";
import type { PGliteWorker } from "@electric-sql/pglite/worker";
import { Kysely } from "kysely";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { persistCharacterEditBatch } from "../edit/persistCharacterEdits";
import {
	CharacterAggregateRowSchema,
	characterAggregateSignature,
	parseCharacterAggregateRows,
	selectCharacterAggregateQuery,
} from "./characterAggregateQuery";

const CLIENT_SQL_URL = new URL("../../../../db/generated/client.sql", import.meta.url);
const PLAYER_ID = "aggregate-player";
const CHARACTER_ID = "aggregate-character-a";

let pglite: PGlite;
let db: Kysely<DB>;

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
	await db
		.insertInto("statistic")
		.values([
			{ ...defaultData.statistic, id: "aggregate-stat-a" },
			{ ...defaultData.statistic, id: "aggregate-stat-b" },
		])
		.execute();
	await db
		.insertInto("player_weapon")
		.values([
			{
				...defaultData.player_weapon,
				id: "aggregate-weapon-b",
				name: "Weapon B",
				belongToPlayerId: PLAYER_ID,
			},
			{
				...defaultData.player_weapon,
				id: "aggregate-weapon-a",
				name: "Weapon A",
				belongToPlayerId: PLAYER_ID,
			},
		])
		.execute();
	await db
		.insertInto("character")
		.values([
			{
				...defaultData.character,
				id: "aggregate-character-b",
				name: "Character B",
				belongToPlayerId: PLAYER_ID,
				statisticId: "aggregate-stat-b",
			},
			{
				...defaultData.character,
				id: CHARACTER_ID,
				name: "Character A",
				belongToPlayerId: PLAYER_ID,
				statisticId: "aggregate-stat-a",
				weaponId: "aggregate-weapon-a",
			},
		])
		.execute();
}, 120_000);

afterAll(async () => {
	await db.destroy();
	await pglite.close();
});

describe("Character scoped aggregate query", () => {
	it("只展开当前 Character 深关系，并聚合 Player 资产与 Character 摘要", async () => {
		const rows = await selectCharacterAggregateQuery(db, {
			playerId: PLAYER_ID,
			characterId: CHARACTER_ID,
		}).execute();
		const aggregate = parseCharacterAggregateRows(rows);

		expect(rows).toHaveLength(1);
		expect(aggregate).toMatchObject({
			player: { id: PLAYER_ID },
			character: { id: CHARACTER_ID, weapon: { id: "aggregate-weapon-a" } },
		});
		expect(aggregate?.characters.map((character) => character.id)).toEqual([
			"aggregate-character-a",
			"aggregate-character-b",
		]);
		expect(aggregate?.assets.weapons.map((weapon) => weapon.id)).toEqual(["aggregate-weapon-a", "aggregate-weapon-b"]);
		expect(aggregate?.assets.weaponsById["aggregate-weapon-a"]?.name).toBe("Weapon A");
	});

	it("playerId 与 characterId 必须同时匹配", async () => {
		const wrongPlayerRows = await selectCharacterAggregateQuery(db, {
			playerId: "other-player",
			characterId: CHARACTER_ID,
		}).execute();
		expect(parseCharacterAggregateRows(wrongPlayerRows)).toBeNull();
	});

	it("关系集合返回顺序变化不改变规范化签名", async () => {
		const rows = await selectCharacterAggregateQuery(db, {
			playerId: PLAYER_ID,
			characterId: CHARACTER_ID,
		}).execute();
		const row = CharacterAggregateRowSchema.parse(rows[0]);
		const reordered = {
			...row,
			characters: [...row.characters].reverse(),
			weapons: [...row.weapons].reverse(),
		};

		const first = parseCharacterAggregateRows([row]);
		const second = parseCharacterAggregateRows([reordered]);
		expect(characterAggregateSignature(second)).toBe(characterAggregateSignature(first));
	});

	it("本地编辑事务完成后 aggregate 可以读取最新业务值", async () => {
		const beforeRows = await selectCharacterAggregateQuery(db, {
			playerId: PLAYER_ID,
			characterId: CHARACTER_ID,
		}).execute();
		const before = parseCharacterAggregateRows(beforeRows);
		if (!before) throw new Error("Character aggregate 不存在");
		await persistCharacterEditBatch(db, CHARACTER_ID, [
			{ type: "character.fields.update", patch: { name: "Character A Updated" } },
		]);
		const committedRows = await selectCharacterAggregateQuery(db, {
			playerId: PLAYER_ID,
			characterId: CHARACTER_ID,
		}).execute();
		const committed = parseCharacterAggregateRows(committedRows);
		expect(committed?.character.name).toBe("Character A Updated");
	});

	it("删除 Character 技能时先删除引用它的连击步骤", async () => {
		const characterSkillId = "aggregate-character-skill";
		const comboId = "aggregate-combo";
		const comboStepId = "aggregate-combo-step";
		const skillId = "aggregate-skill";
		await db
			.insertInto("statistic")
			.values({ ...defaultData.statistic, id: "aggregate-skill-stat" })
			.execute();
		await db
			.insertInto("skill")
			.values({ ...defaultData.skill, id: skillId, statisticId: "aggregate-skill-stat" })
			.execute();
		await db
			.insertInto("character_skill")
			.values({
				...defaultData.character_skill,
				id: characterSkillId,
				templateId: skillId,
				belongToCharacterId: CHARACTER_ID,
			})
			.execute();
		await db
			.insertInto("combo")
			.values({ ...defaultData.combo, id: comboId, belongToCharacterId: CHARACTER_ID })
			.execute();
		await db
			.insertInto("combo_step")
			.values({ ...defaultData.combo_step, id: comboStepId, characterSkillId, belongToComboId: comboId })
			.execute();

		const rows = await selectCharacterAggregateQuery(db, {
			playerId: PLAYER_ID,
			characterId: CHARACTER_ID,
		}).execute();
		const aggregate = parseCharacterAggregateRows(rows);
		if (!aggregate) throw new Error("Character aggregate 不存在");
		const previousChange = await pglite.query<{ id: string }>(
			"SELECT id::text AS id FROM changes ORDER BY id DESC LIMIT 1",
		);
		await persistCharacterEditBatch(db, CHARACTER_ID, [
			{
				type: "skills.removeTree",
				treeType: defaultData.skill.treeType,
			},
		]);

		expect(await db.selectFrom("combo_step").where("id", "=", comboStepId).select("id").execute()).toEqual([]);
		expect(await db.selectFrom("character_skill").where("id", "=", characterSkillId).select("id").execute()).toEqual(
			[],
		);
		const changes = await pglite.query<{ table_name: string; operation: string }>(
			"SELECT table_name, operation FROM changes WHERE id > $1 AND operation = 'delete' ORDER BY id",
			[previousChange.rows[0]?.id ?? "0"],
		);
		expect(changes.rows).toEqual([
			{ table_name: "combo_step", operation: "delete" },
			{ table_name: "character_skill", operation: "delete" },
		]);
	});
});
