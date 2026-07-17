import { defaultData } from "@db/defaultData";
import { insertMember } from "@db/generated/repositories/member";
import { selectMobById } from "@db/generated/repositories/mob";
import { insertSimulator, type Simulator, updateSimulator } from "@db/generated/repositories/simulator";
import { insertStatistic } from "@db/generated/repositories/statistic";
import { insertTeam } from "@db/generated/repositories/team";
import { getDB } from "@db/repositories/database";
import { createId } from "@paralleldrive/cuid2";
import { ensureAccountPlayer } from "~/session/accountPlayer";
import { ensureTemporaryAccount } from "~/session/temporaryAccount";

export const TRAINING_DUMMY_MOB_ID = "defaultTrainingDummyMobId";

export type CreateTrainingSimulatorInput = {
	name: string;
	characterId: string;
};

/**
 * 创建首个可运行的木桩验证设计。
 *
 * 该事务只编排既有持久实体：Simulator 独占两支 Team/Member，Player Member 引用账号下的
 * Character，Mob Member 引用系统木桩；主控与分析范围在成员写入后一次闭合，避免留下半成品设计。
 */
export async function createTrainingSimulator(input: CreateTrainingSimulatorInput): Promise<Simulator> {
	const name = input.name.trim();
	if (!name) throw new Error("Simulator 名称不能为空");
	if (!input.characterId) throw new Error("请选择用于验证的 Character");

	const db = await getDB();
	return await db.transaction().execute(async (trx) => {
		const account = await ensureTemporaryAccount(trx);
		const player = await ensureAccountPlayer(account.id, trx);
		const character = await trx
			.selectFrom("character")
			.where("character.id", "=", input.characterId)
			.where("character.belongToPlayerId", "=", player.id)
			.select(["character.id", "character.name"])
			.executeTakeFirst();
		if (!character) throw new Error("所选 Character 不属于当前账号，无法创建 Simulator");

		const trainingDummy = await selectMobById(TRAINING_DUMMY_MOB_ID, trx);
		if (!trainingDummy) throw new Error("训练木桩数据尚未同步，请稍后重试");

		const simulatorId = createId();
		const statisticId = createId();
		const teamAId = createId();
		const teamBId = createId();
		const playerMemberId = createId();
		const targetMemberId = createId();
		const now = new Date().toISOString();

		await insertStatistic(
			{
				...defaultData.statistic,
				id: statisticId,
				createdAt: now,
				updatedAt: now,
			},
			trx,
		);
		await insertSimulator(
			{
				...defaultData.simulator,
				id: simulatorId,
				name,
				randomSeed: 1,
				logicHz: 60,
				primaryMemberId: null,
				details: "一名手动 Player 对固定训练木桩",
				statisticId,
				createdByAccountId: account.id,
				updatedByAccountId: account.id,
			},
			trx,
		);
		await insertTeam(
			{
				...defaultData.team,
				id: teamAId,
				name: "Player",
				camp: "A",
				belongToSimulatorId: simulatorId,
			},
			trx,
		);
		await insertTeam(
			{
				...defaultData.team,
				id: teamBId,
				name: "Target",
				camp: "B",
				belongToSimulatorId: simulatorId,
			},
			trx,
		);
		await insertMember(
			{
				...defaultData.member,
				id: playerMemberId,
				name: character.name || "Player",
				formationOrder: 0,
				type: "Player",
				characterId: character.id,
				partnerId: null,
				mercenaryId: null,
				mobId: null,
				mobDifficultyFlag: null,
				behavior: null,
				belongToTeamId: teamAId,
			},
			trx,
		);
		await insertMember(
			{
				...defaultData.member,
				id: targetMemberId,
				name: trainingDummy.name,
				formationOrder: 0,
				type: "Mob",
				characterId: null,
				partnerId: null,
				mercenaryId: null,
				mobId: trainingDummy.id,
				mobDifficultyFlag: "Normal",
				behavior: null,
				belongToTeamId: teamBId,
			},
			trx,
		);

		const simulator = await updateSimulator(simulatorId, { primaryMemberId: playerMemberId }, trx);
		await trx.insertInto("_simulatorAnalysisSources").values({ A: playerMemberId, B: simulatorId }).execute();
		await trx.insertInto("_simulatorAnalysisTargets").values({ A: targetMemberId, B: simulatorId }).execute();

		return simulator;
	});
}
