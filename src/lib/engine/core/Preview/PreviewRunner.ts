import { createLogger } from "~/lib/Logger";
import type { GameEngine } from "../GameEngine";
import type { EngineCheckpoint } from "../types";
import { createPreviewConfig } from "../types";
import { resolvePreviewFastForwardTimeoutMs } from "./previewTimeout";
import type { PreviewReport, SkillProbeResult } from "./types";

const log = createLogger("PreviewRunner");

export class PreviewRunner {
	constructor(private engine: GameEngine) {}

	/**
	 * 对成员执行技能探测，生成 PreviewReport。
	 * 每个技能：restore checkpoint → 注入技能动作 → fastForwardSync → 收集伤害 → 循环下一个。
	 */
	runPreview(memberId: string): PreviewReport {
		const startTime = performance.now();
		const checkpoint = this.engine.captureCheckpoint();

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

		const skillInfos = this.engine.getComputedSkillInfos(memberId);
		const skillProbes: SkillProbeResult[] = [];

		for (const skill of skillInfos) {
			const probeResult = this.probeSkill(memberId, skill.id, skill.name, checkpoint);
			skillProbes.push(probeResult);
		}

		this.engine.restoreCheckpoint(checkpoint);

		return {
			memberId,
			statSnapshot,
			skillProbes,
			elapsedMs: performance.now() - startTime,
		};
	}

	/**
	 * 探测单个技能：
	 * 1. restore 到干净检查点
	 * 2. 以 preview 模式启动引擎
	 * 3. 注入技能使用事件到成员 FSM
	 * 4. 同步快进直到成员行为序列结束
	 * 5. 收集命中等域事件中的伤害值
	 */
	private probeSkill(
		memberId: string,
		skillId: string,
		skillName: string,
		checkpoint: EngineCheckpoint,
	): SkillProbeResult {
		this.engine.restoreCheckpoint(checkpoint);

		const member = this.engine.getMember(memberId);
		if (!member) {
			return {
				skillId,
				skillName,
				predictedDamage: 0,
				mpCost: 0,
				castTimeMs: 0,
				cooldownMs: 0,
				isAvailable: false,
			};
		}

		const skillInfos = this.engine.getComputedSkillInfos(memberId);
		const info = skillInfos.find((s) => s.id === skillId);

		if (!info?.computed.isAvailable) {
			return {
				skillId,
				skillName,
				predictedDamage: 0,
				mpCost: info?.computed.mpCost ?? 0,
				castTimeMs: 0,
				cooldownMs: info?.computed.cooldownRemaining ?? 0,
				isAvailable: false,
			};
		}

		// 配置引擎为预览模式（unclocked + 成员行为序列完成后停止）
		this.engine.setRuntimeConfig(
			createPreviewConfig({
				stopPolicy: { kind: "untilMemberActionEnds", memberId },
				outputPolicy: "returnPreviewReport",
			}),
		);

		// 收集伤害事件的临时缓冲区
		let totalDamage = 0;
		const damageCollector = (event: { payload: unknown }) => {
			const payload = event.payload as { type?: string; damage?: number; memberId?: string };
			if (payload.type === "hit" && payload.memberId === memberId && typeof payload.damage === "number") {
				totalDamage += payload.damage;
			}
		};

		const memberEntry = this.engine.getMember(memberId);
		if (!memberEntry) {
			return {
				skillId,
				skillName,
				predictedDamage: 0,
				mpCost: info.computed.mpCost,
				castTimeMs: 0,
				cooldownMs: info.computed.cooldownRemaining,
				isAvailable: true,
			};
		}

		// 注入技能使用事件到成员 FSM
		memberEntry.actor.send({ type: "使用技能", data: { target: "", skillId } });

		// 执行同步快进
		const timeoutMs = resolvePreviewFastForwardTimeoutMs(info.computed.activeEffectDurationMs);
		const { ticksRun } = this.engine.fastForwardSync({ maxDurationMs: timeoutMs });

		log.debug(`探测技能 ${skillId}(${skillName}): 执行 ${ticksRun} tick, 累计伤害 ${totalDamage}`);

		return {
			skillId,
			skillName,
			predictedDamage: totalDamage,
			mpCost: info.computed.mpCost,
			castTimeMs: info.computed.activeEffectDurationMs,
			activeEffectDurationMs: info.computed.activeEffectDurationMs,
			cooldownMs: info.computed.cooldownRemaining,
			isAvailable: info.computed.isAvailable,
		};
	}
}
