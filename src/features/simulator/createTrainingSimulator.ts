import { defaultData } from "@db/defaultData";
import { insertMemberQuery } from "@db/generated/repositories/member";
import { selectMobByIdQuery } from "@db/generated/repositories/mob";
import { insertSimulatorQuery, type Simulator, updateSimulatorQuery } from "@db/generated/repositories/simulator";
import { insertTeamQuery } from "@db/generated/repositories/team";
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

		const trainingDummy = await selectMobByIdQuery(trx, TRAINING_DUMMY_MOB_ID).executeTakeFirst();
		if (!trainingDummy) throw new Error("训练木桩数据尚未同步，请稍后重试");

		const simulatorId = createId();
		const teamAId = createId();
		const teamBId = createId();
		const playerMemberId = createId();
		const targetMemberId = createId();
		await insertSimulatorQuery(trx, {
			...defaultData.simulator,
			id: simulatorId,
			name,
			randomSeed: 1,
			logicHz: 60,
			primaryMemberId: null,
			details: "一名手动 Player 对固定训练木桩",
			createdByAccountId: account.id,
			updatedByAccountId: account.id,
		}).executeTakeFirstOrThrow();
		await insertTeamQuery(trx, {
			...defaultData.team,
			id: teamAId,
			name: "Player",
			camp: "A",
			belongToSimulatorId: simulatorId,
		}).executeTakeFirstOrThrow();
		await insertTeamQuery(trx, {
			...defaultData.team,
			id: teamBId,
			name: "Target",
			camp: "B",
			belongToSimulatorId: simulatorId,
		}).executeTakeFirstOrThrow();
		await insertMemberQuery(trx, {
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
		}).executeTakeFirstOrThrow();
		await insertMemberQuery(trx, {
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
		}).executeTakeFirstOrThrow();

		const simulator = await updateSimulatorQuery(trx, simulatorId, {
			primaryMemberId: playerMemberId,
		}).executeTakeFirstOrThrow();
		await trx.insertInto("_simulatorAnalysisSources").values({ A: playerMemberId, B: simulatorId }).execute();
		await trx.insertInto("_simulatorAnalysisTargets").values({ A: targetMemberId, B: simulatorId }).execute();

		return simulator;
	});
}
