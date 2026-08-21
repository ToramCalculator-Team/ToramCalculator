import { defaultData } from "@db/defaultData";
import { type CharacterWithRelations, CharacterWithRelationsSchema } from "@db/generated/repositories/character";
import type { CharacterSkillWithRelations } from "@db/generated/repositories/character_skill";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BUILT_IN_EVENTS } from "~/engine/core/Event/BuiltInEvents";
import { EventCatalog } from "~/engine/core/Event/EventCatalog";
import { getBuiltInTags } from "~/engine/core/Event/TagConstants";
import { TagRegistry } from "~/engine/core/Event/TagRegistry";
import { GameEngine } from "~/engine/core/GameEngine";
import { JSProcessor } from "~/engine/core/JSProcessor/JSProcessor";
import { PipelineCatalog } from "~/engine/core/Pipeline/PipelineCatalog";
import { PipelineResolverService } from "~/engine/core/Pipeline/PipelineResolverService";
import { executeSimulationTask } from "~/engine/core/thread/executeSimulationTask";
import type { EngineInfrastructure } from "~/engine/core/types";
import { projectCharacterSkillPreviewRow } from "../ui/SkillPreviewPanel";
import type { CharacterPreviewPolicy } from "./compileCharacterPreviewBehavior";
import { interpretCharacterPreviewResult } from "./interpretCharacterPreviewResult";
import { createDefaultCharacterPreviewPolicy, resolveCharacterPreviewTask } from "./resolveCharacterPreviewTask";

const MAGIC_ARROW_SKILL_ID = "character-skill:magic-arrow";
const MAGIC_ARROW_TEMPLATE_ID = "edb34ygvosutw7qb2kl6rt7j";
const MAGIC_CANNON_SKILL_ID = "character-skill:magic-cannon";
const MAGIC_CANNON_TEMPLATE_ID = "vh6phwi59yl8isvadjw6ybyu";

const magicArrowActiveDefinition = `root {
	sequence {
		action [animation,"skill.chanting"]
		wait [$currentSkill.lifecycle.chanting]
		action [animation,"skill.startup"]
		wait [$currentSkill.lifecycle.startup]
		action [singleAttack, $targetId, "magic", "magic", "(((self.lv - target.lv + self.atk.m) * (1 - target.red.m) - target.def.m * (1 - self.pie.m)) + 90+skillLv*5) * (65+skillLv*6) / 100", "Math.floor((skillLv-1)/2)+4", ["is_place"], [], true, "(0.5)*1000"]
		action [animation,"skill.recovery"]
		wait [$currentSkill.lifecycle.recovery]
	}
}`;

const magicCannonActiveDefinition = `root {
	selector {
		sequence {
			condition [hasBuff,"魔法炮充能buff"]
			action [animation,"skill.startup"]
			wait [$currentSkill.lifecycle.startup]
			action [lineAttack,$targetId,"magic","magic",$伤害计算公式,1,$伤害标签,[],true,3]
			action [removeBuff,"魔法炮充能buff"]
			action [animation,"skill.recovery"]
			wait [$currentSkill.lifecycle.recovery]
		}
		sequence {
			action [animation,"skill.startup"]
			wait [$currentSkill.lifecycle.startup]
			action [addBuff,"魔法炮充能buff"]
			action [animation,"skill.recovery"]
			wait [$currentSkill.lifecycle.recovery]
		}
	}
}`;

const magicCannonAgent = `class Agent {
	get 伤害计算公式() {
		const 有效魔攻 = "(self.lv - target.lv + self.atk.m) * target.red.m - target.def.m * (1 - self.pie.m)";
		return \`(\${有效魔攻} + 100) * (100 + skillLv * 5 + self.vit + self.str) / 100\`;
	}
	get 伤害标签() {
		return ["magic"];
	}
}`;

const createSkill = (input: {
	characterId: string;
	characterSkillId: string;
	templateId: string;
	name: string;
	level: number;
	variantId: string;
	mpCost: string;
	chantingModifiedMs?: string;
	actionFixedMs: string;
	actionModifiedMs: string;
	startupRatio: string;
	activeDefinition: string;
	activeAgent?: string;
	registeredBehaviorTrees?: Array<{
		id: string;
		name: string;
		definition: string;
		attributeSlots: Array<{ path: string; attribute: { expression: string; displayName: string } }>;
	}>;
}): CharacterSkillWithRelations => ({
	...defaultData.character_skill,
	id: input.characterSkillId,
	lv: input.level,
	templateId: input.templateId,
	belongToCharacterId: input.characterId,
	template: {
		...defaultData.skill,
		id: input.templateId,
		name: input.name,
		treeType: "MagicSkill",
		variants: [
			{
				...defaultData.skill_variant,
				id: input.variantId,
				targetMainWeaponType: "Magictool",
				targetSubWeaponType: "Any",
				targetArmorAbilityType: "Any",
				mpCost: input.mpCost,
				targetType: "Enemy",
				chantingModifiedMs: input.chantingModifiedMs ?? null,
				actionFixedMs: input.actionFixedMs,
				actionModifiedMs: input.actionModifiedMs,
				startupRatio: input.startupRatio,
				belongToskillId: input.templateId,
				activeBehaviorTree: {
					...defaultData.behavior_tree,
					id: `${input.variantId}:active`,
					name: `${input.name} 主动行为`,
					definition: input.activeDefinition,
					agent: input.activeAgent ?? "",
					activeOwnerId: input.variantId,
				},
				passiveBehaviorTree: null,
				registeredBehaviorTrees: (input.registeredBehaviorTrees ?? []).map((tree) => ({
					...defaultData.behavior_tree,
					...tree,
					registeredOwnerId: input.variantId,
				})),
			},
		],
	},
});

/** 构造技能面板实际消费的完整 Character 输入，装备与技能变体保持固定以避免分支歧义。 */
const createPreviewCharacter = (): CharacterWithRelations => {
	const characterId = "character:skill-preview";
	return CharacterWithRelationsSchema.parse({
		...defaultData.character,
		id: characterId,
		name: "技能预览测试机体",
		lv: 100,
		str: 10,
		int: 255,
		vit: 10,
		agi: 10,
		dex: 100,
		weaponId: "weapon:magictool",
		subWeaponId: null,
		armorId: null,
		optionId: null,
		specialId: null,
		weapon: {
			...defaultData.player_weapon,
			id: "weapon:magictool",
			name: "测试魔导具",
			type: "Magictool",
			baseAbi: 100,
			stability: 100,
			template: null,
			crystals: [],
		},
		subWeapon: null,
		armor: null,
		option: null,
		special: null,
		avatars: [],
		skills: [
			createSkill({
				characterId,
				characterSkillId: MAGIC_ARROW_SKILL_ID,
				templateId: MAGIC_ARROW_TEMPLATE_ID,
				name: "法术/飞箭",
				level: 5,
				variantId: "r8tvr8ts35ln6m1cy3o5pd55",
				mpCost: "100",
				chantingModifiedMs: "2000",
				actionFixedMs: "917",
				actionModifiedMs: "1667",
				startupRatio: "0.5",
				activeDefinition: magicArrowActiveDefinition,
			}),
			createSkill({
				characterId,
				characterSkillId: MAGIC_CANNON_SKILL_ID,
				templateId: MAGIC_CANNON_TEMPLATE_ID,
				name: "法术/魔法炮",
				level: 10,
				variantId: "biqvrva0zpgc6wiojl4pho82",
				mpCost: "0",
				actionFixedMs: "1000",
				actionModifiedMs: "0",
				startupRatio: "0.5",
				activeDefinition: magicCannonActiveDefinition,
				activeAgent: magicCannonAgent,
				registeredBehaviorTrees: [
					{
						id: "MagicCannonVariant1Id__registered_bt_1",
						name: "魔法炮充能buff",
						definition:
							'root { repeat { sequence { wait [1000] action [modifyAttribute,"buff.magicCannon.charge","1","dynamicFixed"] } } }',
						attributeSlots: [
							{
								path: "buff.magicCannon.charge",
								attribute: { expression: "0", displayName: "魔法炮充能数" },
							},
						],
					},
				],
			}),
		],
		registlets: [],
		consumables: [],
		combos: [],
	});
};

const createEngine = () => {
	const pipelineCatalog = new PipelineCatalog();
	const infrastructure: EngineInfrastructure = {
		jsProcessor: new JSProcessor(),
		pipelineCatalog,
		pipelineResolverService: new PipelineResolverService(pipelineCatalog),
		tagRegistry: new TagRegistry(getBuiltInTags()),
		eventCatalog: new EventCatalog(BUILT_IN_EVENTS),
	};
	return new GameEngine(
		{
			eventQueueConfig: { maxQueueSize: 100, enablePerformanceMonitoring: false },
			frameLoopConfig: {
				logicHz: 60,
				maxCatchUpTicks: 1,
				enablePerformanceMonitoring: false,
				timeScale: 1,
				maxEventsPerTick: 100,
			},
		},
		infrastructure,
	);
};

/** 执行与 CharacterSession 相同的任务构造、引擎运行、结果解释和面板投影链路。 */
const calculatePreviewRow = async (
	character: CharacterWithRelations,
	candidateSkillId: string,
	policy: CharacterPreviewPolicy,
) => {
	const engine = createEngine();
	try {
		const task = resolveCharacterPreviewTask({
			runId: `preview:${candidateSkillId}`,
			character,
			policy,
			candidateSkillId,
		});
		const taskResult = await executeSimulationTask(engine, task);
		const result = interpretCharacterPreviewResult(taskResult, policy, candidateSkillId);
		const learnedSkill = character.skills.find((skill) => skill.id === candidateSkillId);
		if (!learnedSkill) throw new Error(`测试机体缺少技能 ${candidateSkillId}`);
		return {
			result,
			row: projectCharacterSkillPreviewRow(learnedSkill, { status: "succeeded", result }),
			taskResult,
		};
	} finally {
		engine.cleanup();
	}
};

describe("SkillPreviewPanel 真实技能伤害", () => {
	beforeAll(() => GameEngine.enableForTesting());
	afterAll(() => GameEngine.disableForTesting());

	it("计算法术飞箭多段伤害并投影到技能面板", async () => {
		const character = createPreviewCharacter();
		const policy = createDefaultCharacterPreviewPolicy(character.id);

		const preview = await calculatePreviewRow(character, MAGIC_ARROW_SKILL_ID, policy);

		expect(preview.result).toMatchObject({
			status: "accepted",
			candidateSkillId: MAGIC_ARROW_SKILL_ID,
		});
		expect(preview.taskResult.output.damage).toHaveLength(3);
		expect(preview.row).toMatchObject({
			id: MAGIC_ARROW_SKILL_ID,
			name: "法术/飞箭",
			level: 5,
			loading: false,
		});
		expect(preview.row.damage).toBeCloseTo(681.625);
	});

	it("先充能再发射魔法炮，并只把候选发射伤害投影到技能面板", async () => {
		const character = createPreviewCharacter();
		const basePolicy = createDefaultCharacterPreviewPolicy(character.id);
		const policy: CharacterPreviewPolicy = {
			...basePolicy,
			setupSkills: [{ skillId: MAGIC_CANNON_SKILL_ID, targetMemberId: basePolicy.trainingTargetMemberId }],
		};

		const preview = await calculatePreviewRow(character, MAGIC_CANNON_SKILL_ID, policy);

		expect(preview.result).toMatchObject({
			status: "accepted",
			candidateSkillId: MAGIC_CANNON_SKILL_ID,
		});
		expect(preview.taskResult.output.skillReleases.map((release) => release.skillId)).toEqual([
			MAGIC_CANNON_SKILL_ID,
			MAGIC_CANNON_SKILL_ID,
		]);
		expect(preview.taskResult.output.damage).toHaveLength(1);
		expect(preview.row).toMatchObject({
			id: MAGIC_CANNON_SKILL_ID,
			name: "法术/魔法炮",
			level: 10,
			loading: false,
		});
		expect(preview.row.damage).toBe(170);
	});
});
