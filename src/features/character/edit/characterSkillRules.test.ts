import { defaultData } from "@db/defaultData";
import { CharacterSkillSchema, SkillSchema } from "@db/generated/zod/index";
import { describe, expect, it } from "vitest";
import { planCharacterSkillMutations } from "./characterSkillRules";

const createTemplate = (
	id: string,
	options: { preSkillId?: string | null; treeType?: (typeof defaultData.skill)["treeType"] } = {},
) =>
	SkillSchema.parse({
		...defaultData.skill,
		id,
		name: id,
		preSkillId: options.preSkillId ?? null,
		treeType: options.treeType ?? "MagicSkill",
	});

const createCharacterSkill = (id: string, templateId: string, lv: number, options: { isStarGem?: boolean } = {}) =>
	CharacterSkillSchema.parse({
		...defaultData.character_skill,
		id,
		templateId,
		lv,
		isStarGem: options.isStarGem ?? false,
		belongToCharacterId: "character-1",
	});

describe("Character 技能编辑规则", () => {
	it("技能增级从事务快照补齐整条前置链", () => {
		const root = createTemplate("root");
		const middle = createTemplate("middle", { preSkillId: root.id });
		const target = createTemplate("target", { preSkillId: middle.id });
		const plan = planCharacterSkillMutations(
			[{ type: "skills.adjustLevel", templateId: target.id, delta: 1 }],
			[createCharacterSkill("root-skill", root.id, 2)],
			[root, middle, target],
		);

		expect(plan).toEqual({
			updates: [{ characterSkillId: "root-skill", lv: 5 }],
			inserts: [
				{ templateId: middle.id, lv: 5 },
				{ templateId: target.id, lv: 1 },
			],
			deletes: [],
		});
	});

	it("前置技能降到 5 以下时清零整个后继分支", () => {
		const root = createTemplate("root");
		const child = createTemplate("child", { preSkillId: root.id });
		const grandchild = createTemplate("grandchild", { preSkillId: child.id });
		const plan = planCharacterSkillMutations(
			[{ type: "skills.adjustLevel", templateId: root.id, delta: -1 }],
			[
				createCharacterSkill("root-skill", root.id, 5),
				createCharacterSkill("child-skill", child.id, 8),
				createCharacterSkill("grandchild-skill", grandchild.id, 3),
			],
			[root, child, grandchild],
		);

		expect(plan).toEqual({
			updates: [
				{ characterSkillId: "root-skill", lv: 4 },
				{ characterSkillId: "child-skill", lv: 0 },
				{ characterSkillId: "grandchild-skill", lv: 0 },
			],
			inserts: [],
			deletes: [],
		});
	});

	it("删树只删除对应树的普通技能，不删除星石或其他树", () => {
		const magic = createTemplate("magic", { treeType: "MagicSkill" });
		const blade = createTemplate("blade", { treeType: "BladeSkill" });
		const plan = planCharacterSkillMutations(
			[{ type: "skills.removeTree", treeType: "MagicSkill" }],
			[
				createCharacterSkill("magic-normal", magic.id, 10),
				createCharacterSkill("magic-star", magic.id, 10, { isStarGem: true }),
				createCharacterSkill("blade-normal", blade.id, 10),
			],
			[magic, blade],
		);

		expect(plan).toEqual({ updates: [], inserts: [], deletes: ["magic-normal"] });
	});

	it("同一事务内按编辑顺序累计等级增量", () => {
		const target = createTemplate("target");
		const plan = planCharacterSkillMutations(
			[
				{ type: "skills.adjustLevel", templateId: target.id, delta: 1 },
				{ type: "skills.adjustLevel", templateId: target.id, delta: 1 },
			],
			[],
			[target],
		);

		expect(plan).toEqual({ updates: [], inserts: [{ templateId: target.id, lv: 2 }], deletes: [] });
	});

	it("模板缺失或普通技能重复时显式失败", () => {
		const target = createTemplate("target");
		expect(() =>
			planCharacterSkillMutations([{ type: "skills.adjustLevel", templateId: "missing", delta: 1 }], [], [target]),
		).toThrow("技能模板不存在: missing");
		expect(() =>
			planCharacterSkillMutations(
				[],
				[createCharacterSkill("skill-1", target.id, 1), createCharacterSkill("skill-2", target.id, 2)],
				[target],
			),
		).toThrow(`Character 普通技能模板重复: ${target.id}`);
	});
});
