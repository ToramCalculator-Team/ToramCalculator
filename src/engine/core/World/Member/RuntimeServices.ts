import type { ExpressionContext } from "../../JSProcessor/types";
import type { MemberDomainEvent } from "../../types";
import type { DamageAreaSpec } from "../Area/types";
import type { ResolvedDamageEffect } from "../Damage/types";

export type MemberTargetResolver = (sourceMemberId: string, requestedTargetId?: string | null) => string | null;
export type MemberTargetDirectionResolver = (
	sourceMemberId: string,
	targetMemberId: string,
) => { x: number; z: number } | null;

/**
 * 成员运行时服务接口。
 *
 * 说明：
 * - 这些字段由引擎/成员管理器注入。
 * - 它们不是成员状态本身，而是运行时可调用服务。
 */
export interface MemberRuntimeServices {
	/** 当前模拟时间（毫秒，由引擎注入） */
	getCurrentTimeMs: () => number;
	/** 当前逻辑 tick 序号（由引擎注入，仅用于排序/日志）。 */
	getTickIndex: () => number;
	/** 表达式求值器 */
	expressionEvaluator: ((expression: string, context: ExpressionContext) => number | boolean) | null;
	/** 瞬时伤害执行入口：只查询一次范围，不创建 Area。 */
	executeInstantDamage: ((effect: ResolvedDamageEffect) => void) | null;
	/** 持续 Area 创建入口。 */
	createDamageArea: ((spec: DamageAreaSpec) => string) | null;
	/** 域事件发射器 */
	domainEventSender: ((event: MemberDomainEvent) => void) | null;
	/**
	 * 目标解析器。
	 *
	 * 设计说明：
	 * - 未指定目标时为场景装配选择确定的初始目标。
	 * - 显式目标只做成员身份解析；技能只读取已经保存在 runtime 中的 targetId。
	 */
	targetResolver: MemberTargetResolver | null;
	/**
	 * 目标水平方向解析器。
	 *
	 * World 读取两个成员的权威位置并返回单位方向；Member 只负责把方向写为自身 yaw，
	 * 从而保持跨成员空间读取与成员物理状态写入的职责边界。
	 */
	targetDirectionResolver: MemberTargetDirectionResolver | null;
	/** 引擎级随机数生成器（seeded PRNG），用于命中判定等确定性模拟 */
	random: () => number;
}

export const MemberRuntimeServicesDefaults: MemberRuntimeServices = {
	getCurrentTimeMs: () => {
		throw new Error("getCurrentTimeMs 未注入");
	},
	getTickIndex: () => {
		throw new Error("getTickIndex 未注入");
	},
	expressionEvaluator: (expression: string) => {
		throw new Error(`expressionEvaluator 未注入：${expression}`);
	},
	executeInstantDamage: (effect: ResolvedDamageEffect) => {
		throw new Error(`executeInstantDamage 未注入：${effect.rangeKind}`);
	},
	createDamageArea: (spec: DamageAreaSpec) => {
		throw new Error(`createDamageArea 未注入：${spec.rangeKind}`);
	},
	domainEventSender: (event: MemberDomainEvent) => {
		throw new Error(`domainEventSender 未注入：${event}`);
	},
	targetResolver: null,
	targetDirectionResolver: null,
	random: Math.random,
};
