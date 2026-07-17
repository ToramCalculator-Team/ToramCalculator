import { insertCharacter, updateCharacter } from "@db/generated/repositories/character";
import {
	deleteCharacterSkill,
	insertCharacterSkill,
	updateCharacterSkill,
} from "@db/generated/repositories/character_skill";
import { deleteMember, insertMember, updateMember } from "@db/generated/repositories/member";
import { updateSimulator } from "@db/generated/repositories/simulator";
import { deleteTeam, insertTeam, updateTeam } from "@db/generated/repositories/team";
import { getDB } from "@db/repositories/database";
import type { SimulationDesign } from "./simulationDesignSchema";

/**
 * 把候选 DesignCopy 按稳定实体身份写回正式表。共享 Character 保持原 ID 原地更新；
 * Team/Member 的增删改和分析范围在同一个数据库事务中提交，不建立第二套同步协议。
 */
export async function applyDesignCopyToPersistentDesign(
	baseline: SimulationDesign,
	candidate: SimulationDesign,
): Promise<void> {
	if (baseline.id !== candidate.id) throw new Error("DesignCopy 与正式 Simulator 身份不一致");
	const db = await getDB();
	await db.transaction().execute(async (trx) => {
		const baselineTeams = new Map(baseline.teams.map((team) => [team.id, team]));
		const candidateTeams = new Map(candidate.teams.map((team) => [team.id, team]));
		const baselineMembers = new Map(
			baseline.teams.flatMap((team) => team.members.map((member) => [member.id, member] as const)),
		);
		const candidateMembers = new Map(
			candidate.teams.flatMap((team) => team.members.map((member) => [member.id, member] as const)),
		);
		const candidateCharacters = new Map(
			candidate.teams
				.flatMap((team) => team.members)
				.flatMap((member) => (member.character ? [[member.character.id, member.character] as const] : [])),
		);
		const candidateCharacterIds = Array.from(candidateCharacters.keys());
		const persistedCharacterIds = new Set(
			candidateCharacterIds.length === 0
				? []
				: (await trx.selectFrom("character").select("id").where("id", "in", candidateCharacterIds).execute()).map(
						(row) => row.id,
					),
		);
		const persistedSkills =
			candidateCharacterIds.length === 0
				? []
				: await trx
						.selectFrom("character_skill")
						.select(["id", "belongToCharacterId"])
						.where("belongToCharacterId", "in", candidateCharacterIds)
						.execute();
		const persistedSkillIds = new Set(persistedSkills.map((skill) => skill.id));
		const candidateSkillIds = new Set(
			Array.from(candidateCharacters.values()).flatMap((character) => character.skills.map((skill) => skill.id)),
		);

		for (const team of candidateTeams.values()) {
			if (baselineTeams.has(team.id)) await updateTeam(team.id, team, trx);
			else await insertTeam(team, trx);
		}
		for (const character of candidateCharacters.values()) {
			if (persistedCharacterIds.has(character.id)) await updateCharacter(character.id, character, trx);
			else await insertCharacter(character, trx);
		}
		for (const character of candidateCharacters.values()) {
			for (const skill of character.skills) {
				if (persistedSkillIds.has(skill.id)) await updateCharacterSkill(skill.id, skill, trx);
				else await insertCharacterSkill(skill, trx);
			}
		}
		for (const skill of persistedSkills) {
			if (!candidateSkillIds.has(skill.id)) await deleteCharacterSkill(skill.id, trx);
		}
		for (const member of candidateMembers.values()) {
			if (baselineMembers.has(member.id)) await updateMember(member.id, member, trx);
			else await insertMember(member, trx);
		}

		await updateSimulator(candidate.id, candidate, trx);
		await trx.deleteFrom("_simulatorAnalysisSources").where("B", "=", candidate.id).execute();
		await trx.deleteFrom("_simulatorAnalysisTargets").where("B", "=", candidate.id).execute();
		if (candidate.analysisSourceMembers.length > 0) {
			await trx
				.insertInto("_simulatorAnalysisSources")
				.values(candidate.analysisSourceMembers.map((member) => ({ A: member.id, B: candidate.id })))
				.execute();
		}
		if (candidate.analysisTargetMembers.length > 0) {
			await trx
				.insertInto("_simulatorAnalysisTargets")
				.values(candidate.analysisTargetMembers.map((member) => ({ A: member.id, B: candidate.id })))
				.execute();
		}

		for (const memberId of baselineMembers.keys()) {
			if (!candidateMembers.has(memberId)) await deleteMember(memberId, trx);
		}
		for (const teamId of baselineTeams.keys()) {
			if (!candidateTeams.has(teamId)) await deleteTeam(teamId, trx);
		}
	});
}
