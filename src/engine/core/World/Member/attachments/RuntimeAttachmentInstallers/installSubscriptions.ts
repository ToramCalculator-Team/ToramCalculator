import type { EventSubscriptionEffect, RegistletValue } from "@db/schema/jsons";
import { createLogger } from "~/lib/logger";
import type { ExpressionContext } from "../../../../JSProcessor/types";
import { ModifierType } from "../../runtime/AttributeContainer/AttributeContainer";
import type { RuntimeAttachment, RuntimeAttachmentHandler, RuntimeAttachmentMember } from "../RuntimeAttachment";
import {
	runtimeAttachmentLevel,
	runtimeAttachmentModifierSource,
	runtimeAttachmentSourceId,
} from "../RuntimeAttachmentSource";

const log = createLogger("RuntimeAttachmentSubscriptionInstaller");

/** 事件 handler 和阈值 handler 共用同一套等级占位符与表达式求值规则。 */
function substituteLevel(value: RegistletValue, level: number): string | number | boolean {
	if (typeof value !== "string") return value;
	return value.replace(/\{level\}/g, String(level)).replace(/\{levelRate\}/g, String(level / 100));
}

/** 在成员当前运行时上下文中求值 handler 的数值参数。 */
export function evaluateHandlerValue(
	value: RegistletValue,
	member: RuntimeAttachmentMember,
	level: number,
	extraCtx?: Record<string, unknown>,
): number {
	const substituted = substituteLevel(value, level);
	if (typeof substituted === "number") return substituted;
	if (typeof substituted === "boolean") return substituted ? 1 : 0;
	const evaluator = member.services.expressionEvaluator;
	if (!evaluator) return 0;
	const context: ExpressionContext = {
		currentTimeMs: member.runtime.currentTimeMs,
		tickIndex: member.runtime.tickIndex,
		casterId: member.id,
		targetId: member.runtime.targetId,
		level,
		...(extraCtx ?? {}),
	};
	const result = evaluator(substituted, context);
	if (typeof result === "number" && Number.isFinite(result)) return result;
	if (typeof result === "boolean") return result ? 1 : 0;
	log.warn(`表达式结果非法，按 0 处理: ${substituted}`);
	return 0;
}

/** 执行来源声明的动作，并将每个动作的异常隔离在当前 handler 内。 */
function runHandlers(
	handlers: readonly RuntimeAttachmentHandler[],
	member: RuntimeAttachmentMember,
	attachment: RuntimeAttachment,
	timeMs: number,
	eventName?: string,
): void {
	const level = runtimeAttachmentLevel(attachment.source);
	for (const handler of handlers) {
		try {
			switch (handler.type) {
				case "addModifier": {
					const suffix =
						handler.lifetime === "bySource"
							? (handler.sourceIdSuffix ?? "default")
							: `${handler.sourceIdSuffix ?? "once"}.${timeMs}`;
					member.attributeContainer.addModifier(
						handler.attribute,
						{
							dynamicFixed: ModifierType.DYNAMIC_FIXED,
							dynamicPercentage: ModifierType.DYNAMIC_PERCENTAGE,
							staticFixed: ModifierType.STATIC_FIXED,
							staticPercentage: ModifierType.STATIC_PERCENTAGE,
						}[handler.modifierType],
						evaluateHandlerValue(handler.value, member, level),
						runtimeAttachmentModifierSource(
							member.id,
							attachment.source,
							`${runtimeAttachmentSourceId(attachment.source)}.${suffix}`,
							suffix,
						),
					);
					break;
				}
				case "removeModifierBySource":
					for (const type of [
						ModifierType.DYNAMIC_FIXED,
						ModifierType.DYNAMIC_PERCENTAGE,
						ModifierType.STATIC_FIXED,
						ModifierType.STATIC_PERCENTAGE,
					]) {
						member.attributeContainer.removeModifier(
							handler.attribute,
							type,
							`${runtimeAttachmentSourceId(attachment.source)}${handler.sourceIdSuffix ? `.${handler.sourceIdSuffix}` : ""}`,
						);
					}
					break;
				case "emit": {
					if (!member.procBus) break;
					const payload: Record<string, unknown> = {};
					for (const [key, value] of Object.entries(handler.payload))
						payload[key] = substituteLevel(value as RegistletValue, level);
					member.procBus.emit(handler.eventName, payload, timeMs);
					break;
				}
			}
		} catch (error) {
			log.error(`handler 执行失败 (source=${runtimeAttachmentSourceId(attachment.source)}, event=${eventName})`, error);
		}
	}
}

/** 将事件过滤条件转换为 ProcBus 订阅，并绑定来源 handler。 */
export function installSubscriptions(member: RuntimeAttachmentMember, attachment: RuntimeAttachment): void {
	const subscriptions = attachment.subscriptions ?? [];
	if (!subscriptions.length) return;
	if (!member.procBus) {
		log.warn(`ProcBus 未就绪，无法安装订阅: ${runtimeAttachmentSourceId(attachment.source)}`);
		return;
	}
	const sourceId = runtimeAttachmentSourceId(attachment.source);
	for (const subscription of subscriptions as readonly EventSubscriptionEffect[]) {
		const tags = new Set(subscription.requiredDamageTags ?? []);
		const statuses = new Set(subscription.requiredStatusTypes ?? []);
		const predicate =
			tags.size === 0 && statuses.size === 0
				? null
				: (event: { payload: unknown }) => {
						const payload = event.payload as { damageTags?: string[]; type?: string };
						if (tags.size && (!Array.isArray(payload?.damageTags) || !payload.damageTags.some((tag) => tags.has(tag))))
							return false;
						return !(statuses.size && (!payload?.type || !statuses.has(payload.type)));
					};
		member.procBus.subscribeByName(sourceId, subscription.eventNames, predicate, (event) => {
			runHandlers(subscription.handlers, member, attachment, event.timeMs, event.name);
		});
	}
}

export { runHandlers };
