import { createId } from "@paralleldrive/cuid2";
import { type ResolvedSimulatorScene, resolveSimulatorScene } from "./resolveEngineScenario";
import type { SimulationDesign, SimulatorCharacter } from "./simulationDesignSchema";

export type DesignCopy = {
	id: string;
	createdFromId: string | null;
	design: SimulationDesign;
	resolvedScene: ResolvedSimulatorScene;
	createdAt: number;
	hasRun: boolean;
};

export function createDesignCopy(design: SimulationDesign, createdFromId: string | null = null): DesignCopy {
	const id = createId();
	const cloned = structuredClone(design);
	return {
		id,
		createdFromId,
		design: cloned,
		resolvedScene: resolveSimulatorScene(cloned, id),
		createdAt: Date.now(),
		hasRun: false,
	};
}

/**
 * 未运行副本保持身份并原地演进；已被 RunRecord 引用的副本通过新身份 copy-on-write。
 */
export function editDesignCopy(copy: DesignCopy, edit: (draft: SimulationDesign) => void): DesignCopy {
	const draft = structuredClone(copy.design);
	edit(draft);
	const nextId = copy.hasRun ? createId() : copy.id;
	return {
		id: nextId,
		createdFromId: copy.hasRun ? copy.id : copy.createdFromId,
		design: draft,
		resolvedScene: resolveSimulatorScene(draft, nextId),
		createdAt: copy.hasRun ? Date.now() : copy.createdAt,
		hasRun: false,
	};
}

export type DesignFieldDifference = {
	entityType: "simulator" | "team" | "member" | "character";
	entityId: string;
	field: string;
	before: unknown;
	after: unknown;
};

function structurallyEqual(left: unknown, right: unknown): boolean {
	if (Object.is(left, right)) return true;
	if (Array.isArray(left) && Array.isArray(right)) {
		return left.length === right.length && left.every((value, index) => structurallyEqual(value, right[index]));
	}
	if (typeof left === "object" && left !== null && typeof right === "object" && right !== null) {
		const leftEntries = Object.entries(left);
		const rightObject = right as Record<string, unknown>;
		return (
			leftEntries.length === Object.keys(rightObject).length &&
			leftEntries.every(([key, value]) => key in rightObject && structurallyEqual(value, rightObject[key]))
		);
	}
	return false;
}

const comparedFields = {
	simulator: ["name", "details", "randomSeed", "logicHz", "primaryMemberId"] as const,
	team: ["name", "camp", "gems", "belongToSimulatorId"] as const,
	member: [
		"name",
		"type",
		"formationOrder",
		"behavior",
		"characterId",
		"mobId",
		"mobDifficultyFlag",
		"belongToTeamId",
	] as const,
	character: [
		"name",
		"lv",
		"str",
		"int",
		"vit",
		"agi",
		"dex",
		"personalityType",
		"personalityValue",
		"weaponId",
		"subWeaponId",
		"armorId",
		"optionId",
		"specialId",
		"cooking",
		"modifiers",
		"partnerSkillAId",
		"partnerSkillAType",
		"partnerSkillBId",
		"partnerSkillBType",
		"belongToPlayerId",
		"details",
	] as const,
};

const entitiesById = (design: SimulationDesign) => {
	const teams = new Map(design.teams.map((team) => [team.id, team]));
	const members = new Map(design.teams.flatMap((team) => team.members.map((member) => [member.id, member] as const)));
	const characters = new Map(
		Array.from(members.values()).flatMap((member) =>
			member.character ? ([[member.character.id, member.character]] as const) : [],
		),
	);
	return { teams, members, characters };
};

const characterSkillsForDiff = (character: SimulatorCharacter) =>
	character.skills
		.map((skill) => ({ id: skill.id, templateId: skill.templateId, lv: skill.lv, isStarGem: skill.isStarGem }))
		.sort((left, right) => left.id.localeCompare(right.id));

/** 产生用户应用副本前可检查的字段级差异，不用序列化字符串比较深对象。 */
export function diffDesignCopies(baseline: SimulationDesign, candidate: SimulationDesign): DesignFieldDifference[] {
	const differences: DesignFieldDifference[] = [];
	const compare = (
		entityType: DesignFieldDifference["entityType"],
		entityId: string,
		before: Record<string, unknown>,
		after: Record<string, unknown>,
		fields: readonly string[],
	) => {
		for (const field of fields) {
			if (!structurallyEqual(before[field], after[field])) {
				differences.push({ entityType, entityId, field, before: before[field], after: after[field] });
			}
		}
	};
	compare("simulator", baseline.id, baseline, candidate, comparedFields.simulator);
	const baselineEntities = entitiesById(baseline);
	const candidateEntities = entitiesById(candidate);
	const compareEntityMaps = <T extends { id: string }>(
		entityType: DesignFieldDifference["entityType"],
		beforeById: ReadonlyMap<string, T>,
		afterById: ReadonlyMap<string, T>,
		fields: readonly string[],
		reportDeletes: boolean,
	) => {
		if (reportDeletes) {
			for (const entity of beforeById.values()) {
				if (!afterById.has(entity.id)) {
					differences.push({
						entityType,
						entityId: entity.id,
						field: "$entity",
						before: "present",
						after: "deleted",
					});
				}
			}
		}
		for (const entity of afterById.values()) {
			const before = beforeById.get(entity.id);
			if (!before) {
				differences.push({
					entityType,
					entityId: entity.id,
					field: "$entity",
					before: "absent",
					after: "inserted",
				});
				continue;
			}
			compare(
				entityType,
				entity.id,
				before as unknown as Record<string, unknown>,
				entity as unknown as Record<string, unknown>,
				fields,
			);
		}
	};
	compareEntityMaps("team", baselineEntities.teams, candidateEntities.teams, comparedFields.team, true);
	compareEntityMaps("member", baselineEntities.members, candidateEntities.members, comparedFields.member, true);
	compareEntityMaps(
		"character",
		baselineEntities.characters,
		candidateEntities.characters,
		comparedFields.character,
		false,
	);
	for (const character of candidateEntities.characters.values()) {
		const before = baselineEntities.characters.get(character.id);
		if (!before) continue;
		const beforeSkills = characterSkillsForDiff(before);
		const afterSkills = characterSkillsForDiff(character);
		if (!structurallyEqual(beforeSkills, afterSkills)) {
			differences.push({
				entityType: "character",
				entityId: character.id,
				field: "skills",
				before: beforeSkills,
				after: afterSkills,
			});
		}
	}
	const baselineSources = baseline.analysisSourceMembers.map((member) => member.id).sort();
	const candidateSources = candidate.analysisSourceMembers.map((member) => member.id).sort();
	if (!structurallyEqual(baselineSources, candidateSources)) {
		differences.push({
			entityType: "simulator",
			entityId: candidate.id,
			field: "analysisSourceMembers",
			before: baselineSources,
			after: candidateSources,
		});
	}
	const baselineTargets = baseline.analysisTargetMembers.map((member) => member.id).sort();
	const candidateTargets = candidate.analysisTargetMembers.map((member) => member.id).sort();
	if (!structurallyEqual(baselineTargets, candidateTargets)) {
		differences.push({
			entityType: "simulator",
			entityId: candidate.id,
			field: "analysisTargetMembers",
			before: baselineTargets,
			after: candidateTargets,
		});
	}
	return differences;
}
