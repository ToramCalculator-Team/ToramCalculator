import { createLogger } from "~/lib/Logger";
import type { GameEngine } from "../GameEngine";
import type { EngineCheckpoint } from "../types";
import type { PreviewReport, SkillProbeResult } from "./types";

const _log = createLogger("PreviewRunner");

export class PreviewRunner {
	constructor(private engine: GameEngine) {}

	/**
	 * 对成员执行技能探测，生成 PreviewReport。
	 * 在探测前捕获检查点，并在每次技能探测后回滚。
	 */
	runPreview(memberId: string): PreviewReport {
		const startTime = performance.now();
		const checkpoint = this.engine.captureCheckpoint();

		// 获取成员在当前状态下的属性快照
		const member = this.engine.getMember(memberId);
		if (!member) {
			return {
				memberId,
				statSnapshot: {},
				skillProbes: [],
				elapsedMs: performance.now() - startTime,
			};
		}

		const statSnapshot = member.statContainer.exportNestedValues();

		// 获取技能列表并逐个探测
		const skillInfos = this.engine.getComputedSkillInfos(memberId);
		const skillProbes: SkillProbeResult[] = skillInfos.map((skill) => {
			const probeResult = this.probeSkill(memberId, skill.id, skill.name, checkpoint);
			return probeResult;
		});

		// 最终恢复到原始状态
		this.engine.restoreCheckpoint(checkpoint);

		return {
			memberId,
			statSnapshot,
			skillProbes,
			elapsedMs: performance.now() - startTime,
		};
	}

	/**
	 * 探测单个技能：以预览安全模式运行，收集结果并回滚。
	 */
	private probeSkill(
		memberId: string,
		skillId: string,
		skillName: string,
		checkpoint: EngineCheckpoint,
	): SkillProbeResult {
		// 探测前先恢复到检查点状态
		this.engine.restoreCheckpoint(checkpoint);

		const member = this.engine.getMember(memberId);
		if (!member) {
			return {
				skillId,
				skillName,
				predictedDamage: 0,
				mpCost: 0,
				castTimeFrames: 0,
				cooldownFrames: 0,
				isAvailable: false,
			};
		}

		// 使用计算后的技能信息获取消耗/可用性数据
		const skillInfos = this.engine.getComputedSkillInfos(memberId);
		const info = skillInfos.find((s) => s.id === skillId);

		// TODO: 在后续迭代中，真正以 previewSafe 模式执行技能流水线
		// 并收集伤害输出。当前先返回静态计算信息。
		return {
			skillId,
			skillName,
			predictedDamage: 0, // 占位值 -- 后续迭代会接入完整流水线执行
			mpCost: info?.computed.mpCost ?? 0,
			castTimeFrames: 0,
			cooldownFrames: info?.computed.cooldownRemaining ?? 0,
			isAvailable: info?.computed.isAvailable ?? false,
		};
	}
}
