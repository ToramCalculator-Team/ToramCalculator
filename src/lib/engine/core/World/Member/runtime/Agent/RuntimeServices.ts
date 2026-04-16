import type { ExpressionContext } from "../../../../JSProcessor/types";
import type { MemberDomainEvent } from "../../../../types";
import type { DamageAreaRequest } from "../../../Area/types";

/**
 * 成员运行时服务接口。
 *
 * 说明：
 * - 这些字段由引擎/成员管理器注入。
 * - 它们不是成员状态本身，而是运行时可调用服务。
 */
export interface MemberRuntimeServices {
	/** 当前帧号（由引擎注入） */
	getCurrentFrame: () => number;
	/** 表达式求值器 */
	expressionEvaluator: ((expression: string, context: ExpressionContext) => number | boolean) | null;
	/** 伤害请求处理器 */
	damageRequestHandler: ((damageRequest: DamageAreaRequest) => void) | null;
	/** 渲染消息发射器 */
	renderMessageSender: ((payload: unknown) => void) | null;
	/** 域事件发射器 */
	domainEventSender: ((event: MemberDomainEvent) => void) | null;
}

export const MemberRuntimeServicesDefaults: MemberRuntimeServices = {
	getCurrentFrame: () => {
		throw new Error("getCurrentFrame 未注入");
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
};
