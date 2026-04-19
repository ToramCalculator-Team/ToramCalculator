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
import type { DamageDispatchPayload } from "../Area/types";
import type { Member } from "./Member";
import type { MemberEventType, MemberStateContext } from "./runtime/StateMachine/types";
import type { MemberSharedRuntime } from "./runtime/types";
import { ModifierType } from "./runtime/StatContainer/StatContainer";

const log = createLogger("DamageResolution");

type AnyMember = Member<string, MemberEventType, MemberStateContext, MemberSharedRuntime>;

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
 * 骨架版：`Math.random`；切 seeded PRNG 时改这一处。
 */
export function resolveHitCheck(member: AnyMember, session: HitSession): HitSession {
	const req = session.damageRequest;

	const isMagical = req.damageTags.includes("magical") ? 1 : 0;
	const casterHit = Number(req.casterSnapshot.hit ?? 0);
	const skillMpCost = Number(req.casterSnapshot["skill.mpCost"] ?? 0);

	const output = member.runPipeline("hitCheck", {
		isMagical,
		casterHit,
		skillMpCost,
		damageTags: req.damageTags,
	}) as Record<string, unknown>;

	const hitRate = Number(output.hitRate ?? 0);
	const roll = Math.random() * 100;
	const hit = roll < hitRate;

	session.hitRate = hitRate;
	session.hit = hit;
	return session;
}

/**
 * 命中后计算伤害数值并应用到 StatContainer；同时上报 `hit` domain event。
 *
 * 未命中分支：直接上报 0 伤害的 hit event，不改 HP/MP。
 */
export function resolveDamageAndApply(member: AnyMember, session: HitSession): HitSession {
	const req = session.damageRequest;

	// 未命中：早退出，但也标记结果字段以便后续 consumer 判别状态完整性。
	if (session.hit === false) {
		session.baseDamage = 0;
		session.finalDamage = 0;
		session.isFatal = false;
		session.crit = false;
		session.hpAfter = member.statContainer.getValue("hp.current");
		session.mpAfter = member.statContainer.getValue("mp.current");
		member.notifyDomainEvent({
			type: "hit",
			memberId: member.id,
			damage: 0,
			hp: session.hpAfter,
		});
		return session;
	}

	// 1) 施法者公式求值（formula 中 self 指向施法者快照，target 指向受击者）
	const evaluator = member.services.expressionEvaluator;
	let baseDamage = 0;
	if (evaluator && req.damageFormula) {
		const out = evaluator(req.damageFormula, {
			currentFrame: member.runtime.currentFrame,
			casterId: req.sourceId,
			targetId: member.id,
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
	const damageOutput = member.runPipeline("damageCalc", {
		baseDamage,
		damageTags: req.damageTags,
		warningZone: req.warningZone,
		direction: req.direction,
		...directionalInputs,
		skillLv: req.skillLv,
	}) as Record<string, unknown>;

	const finalDamage = Number(damageOutput.finalDamage ?? 0);
	const isFatal = Number(damageOutput.isFatal ?? 0) >= 1;
	const crit = Number(damageOutput.crit ?? 0) >= 1;

	// 3) applyDamage 管线
	const hpBefore = member.statContainer.getValue("hp.current");
	const mpBefore = member.statContainer.getValue("mp.current");
	const applyOutput = member.runPipeline("applyDamage", {
		finalDamage,
		mpCost: 0,
		damageTags: req.damageTags,
	}) as Record<string, unknown>;

	const hpAfter = Number(applyOutput.hpAfter ?? hpBefore);
	const mpAfter = Number(applyOutput.mpAfter ?? mpBefore);
	const hpDelta = hpAfter - hpBefore;
	const mpDelta = mpAfter - mpBefore;

	// 写回 StatContainer（一次性 modifier，sourceId 带帧号唯一；长期运行的聚合清理是后续迭代事项）
	if (hpDelta !== 0) {
		member.statContainer.addModifier(
			"hp.current",
			ModifierType.DYNAMIC_FIXED,
			hpDelta,
			{
				id: `damage.${req.areaId}.${member.runtime.currentFrame}`,
				name: "damage",
				type: "system",
			},
		);
	}
	if (mpDelta !== 0) {
		member.statContainer.addModifier(
			"mp.current",
			ModifierType.DYNAMIC_FIXED,
			mpDelta,
			{
				id: `damage.${req.areaId}.${member.runtime.currentFrame}.mp`,
				name: "damage-mp",
				type: "system",
			},
		);
	}

	member.notifyDomainEvent({
		type: "hit",
		memberId: member.id,
		damage: finalDamage,
		hp: hpAfter,
	});

	session.baseDamage = baseDamage;
	session.finalDamage = finalDamage;
	session.isFatal = isFatal;
	session.crit = crit;
	session.hpAfter = hpAfter;
	session.mpAfter = mpAfter;
	return session;
}
