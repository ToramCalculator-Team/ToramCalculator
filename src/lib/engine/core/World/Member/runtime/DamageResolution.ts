/**
 * 受击流程的编排辅助函数组。
 *
 * 把 Player / Mob FSM action 里原先 inline 的"命中判定 / 伤害计算 / 应用"编排抽出来，
 * 让 FSM action 只剩一次函数调用 + context 更新。
 *
 * 设计原则：
 * - **纯函数**：不修改 FSM context；只依赖 `Member` 实例本身（member 内部有权修改 StatContainer / 发事件）。
 * - **按阶段拆分**：`resolveHitCheck` 处理命中判定 + 投掷；`resolveDamageAndApply` 处理伤害数值 +
 *   应用 HP/MP + 上报 domain event。FSM 在各自的状态 entry 调用对应函数，中间把结果穿到 `HitSession`。
 * - **跨帧缓存**：整个受击流程的中间结果打包成 `HitSession` 对象，FSM context 持有一个 slot 即可，
 *   避免之前 `pendingDamage / pendingHitResult / pendingDamageResult` 三级 optional 字段。
 */

import { createLogger } from "~/lib/Logger";
import type { ExpressionContext } from "../../../JSProcessor/types";
import type { StageData } from "../../../Pipeline/stageEnv";
import type { MemberDomainEvent } from "../../../types";
import type { DamageDispatchPayload } from "../../Area/types";

const log = createLogger("DamageResolution");

/**
 * 单次受击的完整事务对象。
 *
 * 生命周期：受击事件到达 → `createHitSession(damageRequest)` → 经过 hitCheck →
 * damageCalc + applyDamage → 本轮结束后清空。
 *
 * 状态标志：
 * - 尚未跑 hitCheck：`hitRate === null`
 * - 已命中判定：`hitRate` 有值，`hit` 为 true/false
 * - 已数值计算：`finalDamage` 有值
 * - 已应用 HP：`hpAfter` 有值
 */
export interface HitSession {
	readonly damageRequest: DamageDispatchPayload;

	// 命中判定结果
	hitRate: number | null;
	hit: boolean | null;

	// 数值计算结果
	baseDamage: number | null;
	finalDamage: number | null;
	isFatal: boolean | null;
	crit: boolean | null;

	// 应用结果
	hpAfter: number | null;
	mpAfter: number | null;
}

export function createHitSession(damageRequest: DamageDispatchPayload): HitSession {
	return {
		damageRequest,
		hitRate: null,
		hit: null,
		baseDamage: null,
		finalDamage: null,
		isFatal: null,
		crit: null,
		hpAfter: null,
		mpAfter: null,
	};
}

/**
 * 把 damageRequest 的方位 / 警告区字符串预先数值化，供 pipeline operand 消费。
 * Pipeline compiler 的 operand 只支持 number/string，字符串分支无法参与算术，
 * 这里先展平成 0/1 数值 input。
 */
function buildDirectionalInputs(damageRequest: DamageDispatchPayload): Record<string, number> {
	return {
		isBack: damageRequest.direction === "back" ? 1 : 0,
		isFront: damageRequest.direction === "front" ? 1 : 0,
		isRedZone: damageRequest.warningZone === "red" ? 1 : 0,
		isBlueZone: damageRequest.warningZone === "blue" ? 1 : 0,
	};
}

/**
 * 跑 hitCheck 管线并做随机投掷（FSM 保持纯函数，随机源在此集中）。
 *
 * @param random 引擎级确定性 PRNG 函数（xorshift128），缺省退回 Math.random
 */
export function resolveHitCheck(
	runPipeline: (pipelineName: string, params?: Record<string, unknown>) => StageData,
	session: HitSession,
	random?: () => number,
): HitSession {
	const req = session.damageRequest;

	let hit = false;
	const isMagical = req.damageTags.includes("magical") ? 1 : 0;
	const casterHit = Number(req.casterSnapshot.hit ?? 0);
	const skillMpCost = Number(req.casterSnapshot["skill.mpCost"] ?? 0);

	const output = runPipeline("hitCheck", {
		isMagical,
		casterHit,
		skillMpCost,
		damageTags: req.damageTags,
	}) as Record<string, unknown>;
	log.info("管线输出：", output);

	const hitRate = Number(output.hitRate ?? 0);
	const roll = (random ?? Math.random)() * 100;
	hit = roll < hitRate;

	// 命中率
	session.hitRate = hitRate;
	// 魔法技能强制命中
	session.hit = isMagical ? true : hit;
	return session;
}

/**
 * 命中后计算伤害数值并应用到 StatContainer；同时上报 `hit` domain event。
 *
 * 未命中分支：直接上报 0 伤害的 hit event，不改 HP/MP。
 */
export function resolveDamageAndApply(
	id: string,
	currentTimeMs: number,
	tickIndex: number,
	hpGetter: () => number,
	mpGetter: () => number,
	hpApplyer: (vaule: number) => void,
	mpApplyer: (vaule: number) => void,
	notifyDomainEvent: (event: MemberDomainEvent) => void,
	runPipeline: (pipelineName: string, params?: Record<string, unknown>) => StageData,
	evaluator: ((expression: string, context: ExpressionContext) => number | boolean) | null,
	session: HitSession,
): HitSession {
	const req = session.damageRequest;

	// 未命中：早退出，但也标记结果字段以便后续 consumer 判别状态完整性。
	if (session.hit === false) {
		session.baseDamage = 0;
		session.finalDamage = 0;
		session.isFatal = false;
		session.crit = false;
		session.hpAfter = hpGetter();
		session.mpAfter = mpGetter();
		notifyDomainEvent({
			type: "hit",
			memberId: id,
			damage: 0,
			hp: session.hpAfter,
		});
		log.info("未命中");
		return session;
	}

	// 1) 施法者公式求值（formula 中 self 指向施法者快照，target 指向受击者）
	let baseDamage = 0;
	if (evaluator && req.damageFormula) {
		const out = evaluator(req.damageFormula, {
			currentTimeMs,
			tickIndex,
			casterId: req.sourceId,
			targetId: id,
			skillLv: req.skillLv,
			distance: req.vars.distance,
			targetCount: req.vars.targetCount,
			casterSnapshot: req.casterSnapshot,
		});
		if (typeof out === "number" && Number.isFinite(out)) {
			baseDamage = out;
		} else if (typeof out === "boolean") {
			baseDamage = out ? 1 : 0;
		} else {
			log.warn(`damageFormula 求值非数字，按 0 处理：${req.damageFormula}`);
		}
	}

	// 2) damageCalc 管线
	const directionalInputs = buildDirectionalInputs(req);
	const damageOutput = runPipeline("damageCalc", {
		baseDamage,
		damageTags: req.damageTags,
		warningZone: req.warningZone,
		direction: req.direction,
		...directionalInputs,
		skillLv: req.skillLv,
	}) as Record<string, unknown>;

	const finalDamage = Number(damageOutput.finalDamage ?? 0);
	const crit = Number(damageOutput.crit ?? 0) >= 1;

	// 3) applyDamage 管线
	const hpBefore = hpGetter();
	const mpBefore = mpGetter();
	// 设计说明：damageCount 表示同一次伤害结算后的数学拆段。
	// hitCheck / damageCalc 只执行一次，最终伤害在进入 applyDamage 前按段数均分。
	const damageCount = Math.max(1, Math.floor(req.damageCount || 1));
	const segmentFinalDamage = finalDamage / damageCount;
	const applyOutput = runPipeline("applyDamage", {
		finalDamage: segmentFinalDamage,
		mpCost: 0,
		damageTags: req.damageTags,
	}) as Record<string, unknown>;

	const hpAfter = Number(applyOutput.hpAfter ?? hpBefore);
	const mpAfter = Number(applyOutput.mpAfter ?? mpBefore);
	const isFatal = hpAfter <= 0;
	const hpDelta = hpAfter - hpBefore;
	const mpDelta = mpAfter - mpBefore;
	log.info("hpDelta:", hpDelta, "mpDelta:", mpDelta);

	if (hpDelta !== 0) {
		hpApplyer(hpDelta);
	}
	if (mpDelta !== 0) {
		mpApplyer(mpDelta);
	}

	notifyDomainEvent({
		type: "hit",
		memberId: id,
		damage: segmentFinalDamage,
		hp: hpAfter,
	});

	session.baseDamage = baseDamage;
	session.finalDamage = segmentFinalDamage;
	session.isFatal = isFatal;
	session.crit = crit;
	session.hpAfter = hpAfter;
	session.mpAfter = mpAfter;
	return session;
}
