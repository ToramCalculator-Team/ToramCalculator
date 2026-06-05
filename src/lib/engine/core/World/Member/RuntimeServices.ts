import type { ExpressionContext } from "../../JSProcessor/types";
import type { MemberDomainEvent } from "../../types";
import type { DamageAreaRequest } from "../Area/types";

export type MemberTargetResolver = (sourceMemberId: string, requestedTargetId?: string | null) => string | null;

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
	/** 伤害请求处理器 */
	damageRequestHandler: ((damageRequest: DamageAreaRequest) => void) | null;
	/** 渲染消息发射器 */
	renderMessageSender: ((payload: unknown) => void) | null;
	/** 域事件发射器 */
	domainEventSender: ((event: MemberDomainEvent) => void) | null;
	/**
	 * 目标解析器。
	 *
	 * 设计说明：
	 * - 技能进入 BT 前先把空 target / 自己 target 收敛成一个真实目标。
	 * - 这样 BT、日志和后续伤害动作会消费同一个最终 targetId，不再在动作层各自补救。
	 */
	targetResolver: MemberTargetResolver | null;
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
	damageRequestHandler: (damageRequest: DamageAreaRequest) => {
		throw new Error(`damageRequestHandler 未注入：${damageRequest}`);
	},
	renderMessageSender: (payload: unknown) => {
		throw new Error(`renderMessageSender 未注入：${payload}`);
	},
	domainEventSender: (event: MemberDomainEvent) => {
		throw new Error(`domainEventSender 未注入：${event}`);
	},
	targetResolver: null,
	random: Math.random,
};
