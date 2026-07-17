import { defaultData } from "@db/defaultData";
import { MemberBTSchema, type MemberBTTree } from "@db/schema/jsons";
import { z } from "zod/v4";
import { type EngineMember, EngineMemberSchema, type EngineTeam } from "~/lib/engine/core/engineScenarioSchema";
import { type SimulationTask, SimulationTaskSchema } from "~/lib/engine/core/simulationTask";
import { type EngineScenarioData, EngineScenarioDataSchema } from "~/lib/engine/core/types";
import type { CharacterLiveAggregate } from "../data/characterAggregateQuery";
import {
	type CharacterPreviewPolicy,
	CharacterPreviewPolicySchema,
	compileCharacterPreviewBehavior,
} from "./compileCharacterPreviewBehavior";

const DEFAULT_LOGIC_HZ = 60;
const DEFAULT_MAX_TICKS = 3_600;
const DEFAULT_MAX_DURATION_MS = 15_000;

/** Character 验证只消费当前机体及查询层已经解析到机体上的关系。 */
export type CharacterValidationInput = CharacterLiveAggregate["character"];

const characterIdleBehavior = (): MemberBTTree =>
	MemberBTSchema.parse({
		name: "Character Preview Idle",
		definition: "root { wait [1] }",
		agent: "",
		memberType: "Player",
		attributeSlots: [],
	});

const trainingTargetBehavior = (): MemberBTTree =>
	MemberBTSchema.parse({
		name: "Character Preview Target Idle",
		definition: "root { wait [100000] }",
		agent: "",
		memberType: "Mob",
		attributeSlots: [],
	});

/** 默认策略使用 Character 身份派生稳定场景身份；基础技能序列由应用策略显式覆盖。 */
export function createDefaultCharacterPreviewPolicy(characterId: string): CharacterPreviewPolicy {
	const parsedCharacterId = z.string().min(1).parse(characterId);
	return CharacterPreviewPolicySchema.parse({
		memberId: `character-preview:${parsedCharacterId}:member`,
		trainingTargetMemberId: `character-preview:${parsedCharacterId}:target`,
		setupSkills: [],
	});
}

const resolveScene = (
	character: CharacterValidationInput,
	policy: CharacterPreviewPolicy,
	memberBehavior: MemberBTTree,
): { scenarioData: EngineScenarioData; member: EngineMember } => {
	const parsedPolicy = CharacterPreviewPolicySchema.parse(policy);
	const simulatorId = `character-preview:${character.id}:simulator`;
	const playerTeamId = `${parsedPolicy.memberId}:team`;
	const targetTeamId = `${parsedPolicy.trainingTargetMemberId}:team`;
	const targetMobId = `${parsedPolicy.trainingTargetMemberId}:mob`;
	const member = EngineMemberSchema.parse({
		...defaultData.member,
		id: parsedPolicy.memberId,
		name: character.name ?? "未命名角色",
		formationOrder: 0,
		type: "Player",
		characterId: character.id,
		belongToTeamId: playerTeamId,
		character,
		mob: null,
		resolvedBehavior: memberBehavior,
	});
	const targetMember = EngineMemberSchema.parse({
		...defaultData.member,
		id: parsedPolicy.trainingTargetMemberId,
		name: "Character Preview Target",
		formationOrder: 0,
		type: "Mob",
		characterId: null,
		mobId: targetMobId,
		mobDifficultyFlag: "Normal",
		belongToTeamId: targetTeamId,
		character: null,
		mob: {
			...defaultData.mob,
			id: targetMobId,
			name: "Character Preview Target",
			type: "Mob",
			baseLv: character.lv,
			radius: 1,
			maxhp: 1_000_000,
			dataSources: "character-preview",
		},
		resolvedBehavior: trainingTargetBehavior(),
	});
	const playerTeam: EngineTeam = {
		...defaultData.team,
		id: playerTeamId,
		name: "Character Preview Player",
		camp: "A",
		belongToSimulatorId: simulatorId,
		members: [member],
	};
	const targetTeam: EngineTeam = {
		...defaultData.team,
		id: targetTeamId,
		name: "Character Preview Target",
		camp: "B",
		belongToSimulatorId: simulatorId,
		members: [targetMember],
	};
	return {
		member,
		scenarioData: EngineScenarioDataSchema.parse({
			scenario: {
				randomSeed: 1,
				logicHz: DEFAULT_LOGIC_HZ,
				primaryMemberId: parsedPolicy.memberId,
				campA: [playerTeam],
				campB: [targetTeam],
			},
		}),
	};
};

/** 构造 Character 常驻实时引擎的属性投影场景；不包含候选技能业务步骤。 */
export function resolveCharacterRealtimeScenario(
	character: CharacterValidationInput,
	policy: CharacterPreviewPolicy,
): { scenarioData: EngineScenarioData; member: EngineMember } {
	return resolveScene(character, policy, characterIdleBehavior());
}

export type ResolveCharacterPreviewTaskInput = {
	runId: string;
	character: CharacterValidationInput;
	policy: CharacterPreviewPolicy;
	candidateSkillId: string;
	budget?: { maxTicks?: number; maxDurationMs?: number };
};

/**
 * 从不可变 Character 验证输入构造一个完整、可复现的通用 SimulationTask。
 * 本函数不读取数据库、不调用 Worker，也不判断候选技能是否可用；接纳权始终属于 Player FSM。
 */
export function resolveCharacterPreviewTask(input: ResolveCharacterPreviewTaskInput): SimulationTask {
	const runId = z.string().min(1).parse(input.runId);
	const candidateSkillId = z.string().min(1).parse(input.candidateSkillId);
	const policy = CharacterPreviewPolicySchema.parse(input.policy);
	const { scenarioData } = resolveScene(
		input.character,
		policy,
		compileCharacterPreviewBehavior(policy, candidateSkillId),
	);
	return SimulationTaskSchema.parse({
		runId,
		scenarioData,
		runtimeConfig: {
			driveMode: "unclocked",
			acceptExternalIntents: false,
			timeScale: 1,
			maxTickSkip: 5,
		},
		recordingPolicy: { tickStateHistory: "none" },
		stopPolicy: { kind: "untilMemberFlowEnds", memberId: policy.memberId },
		budget: {
			maxTicks: input.budget?.maxTicks ?? DEFAULT_MAX_TICKS,
			maxDurationMs: input.budget?.maxDurationMs ?? DEFAULT_MAX_DURATION_MS,
		},
	});
}
