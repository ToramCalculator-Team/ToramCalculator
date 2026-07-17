import { MemberBTSchema } from "@db/schema/jsons";
import { z } from "zod/v4";
import { WorldResourceSchema } from "~/lib/3dScene/contracts/worldResource";
import { createDefaultCharacterWorldResource } from "~/lib/3dScene/resources/defaultCharacterResource";
import { type EngineMember, EngineScenarioSchema } from "~/lib/engine/core/engineScenarioSchema";
import { type SimulationDesign, type SimulationDesignMember, SimulationDesignSchema } from "./simulationDesignSchema";

export const ResolvedSimulatorSceneSchema = z.object({
	resolutionVersion: z.string(),
	engineInput: z.object({ scenario: EngineScenarioSchema }),
	worldResources: z.array(WorldResourceSchema),
});

export type ResolvedSimulatorScene = z.output<typeof ResolvedSimulatorSceneSchema>;

const MANUAL_IDLE_BEHAVIOR = MemberBTSchema.parse({
	name: "manual-idle",
	definition: "root { wait [1] }",
	agent: "",
	memberType: "Player",
	attributeSlots: [],
});

/** 把一个已校验 DesignCopy 纯派生为 Engine 的完整逻辑输入。 */
export function deriveEngineScenarioInput(design: SimulationDesign) {
	const members = design.teams.flatMap((team) => team.members);
	const membersById = new Map(members.map((member) => [member.id, member]));
	if (membersById.size !== members.length) throw new Error("Simulator 中存在重复 Member id");

	const primaryMember = design.primaryMemberId ? membersById.get(design.primaryMemberId) : undefined;
	if (!primaryMember || primaryMember.type !== "Player") {
		throw new Error("Simulator 必须指定属于当前设计的 Player 主控成员");
	}

	const sourceIds = design.analysisSourceMembers.map((member) => member.id);
	const targetIds = design.analysisTargetMembers.map((member) => member.id);
	if (sourceIds.length === 0 || targetIds.length === 0) throw new Error("Simulator 分析来源和目标不能为空");
	for (const memberId of [...sourceIds, ...targetIds]) {
		if (!membersById.has(memberId)) throw new Error(`分析范围引用了当前 Simulator 之外的 Member: ${memberId}`);
	}

	const playerIds = new Set<string>();
	const resolveMember = (member: SimulationDesignMember): EngineMember => {
		if (member.type === "Player") {
			if (!member.character || member.mobId || member.partnerId || member.mercenaryId || member.mobDifficultyFlag) {
				throw new Error(`Player Member ${member.id} 的类型关系不合法`);
			}
			if (playerIds.has(member.character.belongToPlayerId)) {
				throw new Error(`同一 Simulator 不能重复配置 Player: ${member.character.belongToPlayerId}`);
			}
			playerIds.add(member.character.belongToPlayerId);
			return { ...member, resolvedBehavior: member.behavior ?? MANUAL_IDLE_BEHAVIOR };
		}
		if (member.type === "Mob") {
			if (!member.mob || member.characterId || member.partnerId || member.mercenaryId || member.behavior) {
				throw new Error(`Mob Member ${member.id} 的类型关系不合法`);
			}
			return { ...member, resolvedBehavior: member.mob.actions };
		}
		throw new Error(`当前引擎尚不支持 ${member.type} Member`);
	};

	const teams = design.teams.map((team) => ({ ...team, members: team.members.map(resolveMember) }));
	return EngineScenarioSchema.parse({
		randomSeed: design.randomSeed,
		logicHz: design.logicHz,
		primaryMemberId: design.primaryMemberId,
		initialTargetIds: { [primaryMember.id]: targetIds[0] },
		campA: teams.filter((team) => team.camp === "A"),
		campB: teams.filter((team) => team.camp === "B"),
	});
}

/**
 * 场景解析的唯一应用编排边界：从同一 DesignCopy 同时派生逻辑输入与静态世界资源。
 */
export function resolveSimulatorScene(input: unknown, resolutionVersion: string): ResolvedSimulatorScene {
	const design = SimulationDesignSchema.parse(input);
	const scenario = deriveEngineScenarioInput(design);
	const worldResources = design.teams.flatMap((team) =>
		team.members.map((member) => {
			if (member.type === "Player" && member.character) {
				return createDefaultCharacterWorldResource({
					memberId: member.id,
					resourceId: member.character.id,
					displayName: member.name,
				});
			}
			if (member.type === "Mob" && member.mob) {
				return {
					memberId: member.id,
					kind: "mob" as const,
					resourceId: member.mob.id,
					displayName: member.name,
					model: { type: "primitive" as const, shape: "sphere" as const },
					appearance: { radius: Math.max(0.1, member.mob.radius), color: "#ffffff" },
					animation: null,
				};
			}
			throw new Error(`Member ${member.id} 缺少可解析的世界资源`);
		}),
	);
	return ResolvedSimulatorSceneSchema.parse({
		resolutionVersion,
		engineInput: { scenario },
		worldResources,
	});
}
