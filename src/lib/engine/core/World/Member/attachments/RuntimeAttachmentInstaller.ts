import type {
	EventSubscriptionEffect,
	PipelineInstructionData,
	PipelinePatchEffect,
	RegistletValue,
	ThresholdWatcherEffect,
} from "@db/schema/jsons";
import { createLogger } from "~/lib/Logger";
import type { ExpressionContext } from "../../../JSProcessor/types";
import type { PipelineInstruction } from "../../../Pipeline/instruction";
import type { PipelineOverlay } from "../../../Pipeline/overlay";
import { type ModifierSource, ModifierType } from "../runtime/StatContainer/StatContainer";
import {
	type RuntimeAttachment,
	type RuntimeAttachmentHandler,
	type RuntimeAttachmentMember,
	type RuntimeAttachmentSource,
	runtimeAttachmentLevel,
	runtimeAttachmentModifierSource,
	runtimeAttachmentSourceId,
} from "./RuntimeAttachment";

const log = createLogger("RuntimeAttachmentInstaller");

function sourceIdOf(source: RuntimeAttachmentSource, suffix?: string): string {
	const base = runtimeAttachmentSourceId(source);
	return suffix ? `${base}.${suffix}` : base;
}

/** 用 level 做简单占位符替换。对非字符串值原样返回。 */
function substituteLevel(value: RegistletValue, level: number): string | number | boolean {
	if (typeof value !== "string") return value;
	if (!value.includes("{")) return value;
	const levelRate = level / 100;
	return value.replace(/\{level\}/g, String(level)).replace(/\{levelRate\}/g, String(levelRate));
}

/**
 * 替换 pipeline 指令 operand 里的 level 占位符。
 *
 * 目的：替换后把纯数字字符串转为 number 字面量，避免 Pipeline compiler 把 `"3"` 当成变量名解析。
 */
function substituteInstructionOperand(op: string | number | undefined, level: number): string | number | undefined {
	if (op === undefined) return undefined;
	if (typeof op === "number") return op;
	const replaced = substituteLevel(op, level);
	if (typeof replaced === "boolean") return replaced ? 1 : 0;
	if (typeof replaced === "number") return replaced;
	const trimmed = replaced.trim();
	if (trimmed.length > 0) {
		const asNum = Number(trimmed);
		if (Number.isFinite(asNum)) return asNum;
	}
	return replaced;
}

function mapModifierType(
	type: "dynamicFixed" | "dynamicPercentage" | "staticFixed" | "staticPercentage",
): ModifierType {
	switch (type) {
		case "dynamicFixed":
			return ModifierType.DYNAMIC_FIXED;
		case "dynamicPercentage":
			return ModifierType.DYNAMIC_PERCENTAGE;
		case "staticFixed":
			return ModifierType.STATIC_FIXED;
		case "staticPercentage":
			return ModifierType.STATIC_PERCENTAGE;
	}
}

function buildInstruction(data: PipelineInstructionData, level: number): PipelineInstruction {
	return {
		target: data.target,
		op: data.op as PipelineInstruction["op"],
		a: substituteInstructionOperand(data.a, level) as PipelineInstruction["a"],
		b: substituteInstructionOperand(data.b, level),
	};
}

function buildOverlayFromPatch(
	patch: PipelinePatchEffect,
	source: RuntimeAttachmentSource,
	level: number,
): PipelineOverlay | null {
	const sourceId = runtimeAttachmentSourceId(source);
	const instructions: PipelineInstruction[] = [];
	for (const step of patch.steps) {
		if (step.type === "insertInstructions") {
			for (const ins of step.instructions) {
				instructions.push(buildInstruction(ins, level));
			}
		} else {
			log.warn(`暂未实现的 patch step 类型 ${step.type}，跳过 (sourceId=${sourceId})`);
		}
	}
	if (instructions.length === 0) return null;

	return {
		id: `${sourceId}.${patch.pipelineName}.${patch.slot}`,
		scope: "member",
		sourceType: source.type,
		sourceId,
		priority: patch.priority,
		revision: 1,
		pipelineName: patch.pipelineName,
		operations: [
			patch.position === "before"
				? { kind: "insertBefore", anchor: patch.slot, instructions }
				: { kind: "insertAfter", anchor: patch.slot, instructions },
		],
	};
}

function evaluateHandlerValue(
	value: RegistletValue,
	member: RuntimeAttachmentMember,
	level: number,
	extraCtx?: Record<string, unknown>,
): number {
	const substituted = substituteLevel(value, level);
	if (typeof substituted === "number") return substituted;
	if (typeof substituted === "boolean") return substituted ? 1 : 0;

	const evaluator = member.services.expressionEvaluator;
	if (!evaluator) {
		log.warn(`evaluateHandlerValue: expressionEvaluator 未注入，字符串值按 0 处理：${substituted}`);
		return 0;
	}
	const ctx: ExpressionContext = {
		currentTimeMs: member.runtime.currentTimeMs,
		tickIndex: member.runtime.tickIndex,
		casterId: member.id,
		targetId: member.runtime.targetId,
		level,
		...(extraCtx ?? {}),
	};
	const out = evaluator(substituted, ctx);
	if (typeof out === "number" && Number.isFinite(out)) return out;
	if (typeof out === "boolean") return out ? 1 : 0;
	log.warn(`evaluateHandlerValue: 非法求值结果 "${substituted}" -> ${String(out)}`);
	return 0;
}

function runHandlers(
	handlers: readonly RuntimeAttachmentHandler[],
	member: RuntimeAttachmentMember,
	source: RuntimeAttachmentSource,
	level: number,
	eventCtx: { timeMs: number; eventName?: string },
): void {
	for (const handler of handlers) {
		try {
			switch (handler.type) {
				case "addModifier": {
					const value = evaluateHandlerValue(handler.value, member, level);
					const suffix =
						handler.lifetime === "bySource"
							? (handler.sourceIdSuffix ?? "default")
							: `${handler.sourceIdSuffix ?? "once"}.${eventCtx.timeMs}`;
					const modifierSource: ModifierSource = runtimeAttachmentModifierSource(
						member.id,
						source,
						sourceIdOf(source, suffix),
						suffix,
					);
					member.statContainer.addModifier(
						handler.attribute,
						mapModifierType(handler.modifierType),
						value,
						modifierSource,
					);
					break;
				}
				case "removeModifierBySource": {
					const sid = sourceIdOf(source, handler.sourceIdSuffix);
					// addModifier 的 handler 默认写入 dynamic 通道；精确移除需枚举四种 ModifierType 尝试。
					for (const type of [
						ModifierType.DYNAMIC_FIXED,
						ModifierType.DYNAMIC_PERCENTAGE,
						ModifierType.STATIC_FIXED,
						ModifierType.STATIC_PERCENTAGE,
					]) {
						member.statContainer.removeModifier(handler.attribute, type, sid);
					}
					break;
				}
				case "emit": {
					const bus = member.procBus;
					if (!bus) {
						log.warn(`emit: ProcBus 未就绪，丢弃事件 ${handler.eventName}`);
						break;
					}
					const payload: Record<string, unknown> = {};
					for (const [k, v] of Object.entries(handler.payload)) {
						payload[k] = substituteLevel(v as RegistletValue, level);
					}
					bus.emit(handler.eventName, payload, eventCtx.timeMs);
					break;
				}
			}
		} catch (error) {
			log.error(
				`handler 执行抛错 (source=${runtimeAttachmentSourceId(source)}, handler=${handler.type}, event=${eventCtx.eventName})`,
				error,
			);
		}
	}
}

function currentTimeMsOf(member: RuntimeAttachmentMember): number {
	try {
		return member.services.getCurrentTimeMs();
	} catch {
		return member.runtime.currentTimeMs;
	}
}

function installSubscriptions(
	member: RuntimeAttachmentMember,
	attachment: RuntimeAttachment,
	subscriptions: readonly EventSubscriptionEffect[],
	level: number,
): void {
	if (subscriptions.length === 0) return;
	if (!member.procBus) {
		log.warn(
			`installRuntimeAttachment: ProcBus 未就绪，subscriptions 无法安装 (source=${runtimeAttachmentSourceId(attachment.source)})`,
		);
		return;
	}

	for (const sub of subscriptions) {
		const tagFilter = new Set(sub.requiredDamageTags ?? []);
		const statusFilter = new Set(sub.requiredStatusTypes ?? []);
		const predicate =
			tagFilter.size === 0 && statusFilter.size === 0
				? null
				: (event: { payload: unknown; name: string }) => {
						const payload = event.payload as { damageTags?: string[]; type?: string };
						if (tagFilter.size > 0) {
							if (!Array.isArray(payload?.damageTags)) return false;
							let hit = false;
							for (const tag of payload.damageTags) {
								if (tagFilter.has(tag)) {
									hit = true;
									break;
								}
							}
							if (!hit) return false;
						}
						if (statusFilter.size > 0) {
							if (!payload?.type || !statusFilter.has(payload.type)) return false;
						}
						return true;
					};
		member.procBus.subscribeByName(sourceIdOf(attachment.source), sub.eventNames, predicate, (event) => {
			runHandlers(sub.handlers, member, attachment.source, level, {
				timeMs: event.timeMs,
				eventName: event.name,
			});
		});
	}
}

function installThresholdWatchers(
	member: RuntimeAttachmentMember,
	attachment: RuntimeAttachment,
	watchers: readonly ThresholdWatcherEffect[],
	level: number,
): void {
	if (watchers.length === 0) return;
	if (!member.procBus) {
		log.warn(
			`installRuntimeAttachment: ProcBus 未就绪，thresholdWatchers 无法安装 (source=${runtimeAttachmentSourceId(attachment.source)})`,
		);
		return;
	}
	const sourceId = sourceIdOf(attachment.source);
	for (const watcher of watchers) {
		const thresholdValue = evaluateHandlerValue(watcher.threshold, member, level);
		const direction = watcher.direction ?? "falling";
		// 阈值穿越降格为 ProcBus 事件源（ADR 0010）：注册被监控点 + 订阅 attr.crossed。
		// 按 register 返回的 registrationId 精确匹配，避免同 (path, threshold) 多源订阅
		// 被彼此跨越事件重复 / 错向唤醒（ADR 0010 问题 A）。
		const registrationId = member.attributeThresholdSource.register(sourceId, watcher.path, thresholdValue, direction, {
			fireOnRegister: watcher.fireOnRegister ?? false,
		});
		let lastFiredTimeMs = Number.NEGATIVE_INFINITY;
		member.procBus.subscribeByName(
			sourceId,
			["attr.crossed"],
			(event) => (event.payload as { registrationId?: number }).registrationId === registrationId,
			(event) => {
				const timeMs = currentTimeMsOf(member);
				const cooldownMs = watcher.cooldownMs ?? 0;
				if (cooldownMs > 0 && timeMs - lastFiredTimeMs < cooldownMs) return;
				lastFiredTimeMs = timeMs;
				const dir = (event.payload as { direction?: string }).direction ?? direction;
				runHandlers(watcher.handlers, member, attachment.source, level, {
					timeMs,
					eventName: `threshold:${watcher.path}:${dir}`,
				});
			},
		);
	}
}

export function uninstallRuntimeAttachment(member: RuntimeAttachmentMember, source: RuntimeAttachmentSource): void {
	const sourceId = runtimeAttachmentSourceId(source);
	member.pipelineOverlays = member.pipelineOverlays.filter(
		(overlay) => overlay.sourceId !== sourceId && !overlay.sourceId.startsWith(`${sourceId}.`),
	);
	member.procBus?.unsubscribeBySource(sourceId);
	member.attributeThresholdSource.unregisterBySource(sourceId);
	member.statContainer.removeModifiersBySourceKeyPrefix(sourceId);
}

/**
 * 安装单个战前附加效果。
 *
 * 设计说明：
 * - 安装前按 sourceId 清理旧条目，使热替换和重复安装保持幂等。
 * - `attributeSlots` 已在 StatContainer 构造前消费，此处不再处理。
 */
export function installRuntimeAttachment<TExtraAttrKey extends string = string>(
	member: RuntimeAttachmentMember<TExtraAttrKey>,
	attachment: RuntimeAttachment<TExtraAttrKey>,
): void {
	uninstallRuntimeAttachment(member, attachment.source);
	const level = runtimeAttachmentLevel(attachment.source);

	for (const modifier of attachment.modifiers ?? []) {
		const source = modifier.source ?? runtimeAttachmentModifierSource(member.id, attachment.source);
		member.statContainer.addModifier(modifier.attribute, modifier.modifierType, modifier.value, source);
	}

	for (const patch of attachment.pipelinePatches ?? []) {
		const overlay = buildOverlayFromPatch(patch, attachment.source, level);
		if (overlay) {
			member.pipelineOverlays.push(overlay);
		}
	}

	installSubscriptions(member, attachment, attachment.subscriptions ?? [], level);
	installThresholdWatchers(member, attachment, attachment.thresholdWatchers ?? [], level);
}

export function installRuntimeAttachments<TExtraAttrKey extends string = string>(
	member: RuntimeAttachmentMember<TExtraAttrKey>,
	attachments: readonly RuntimeAttachment<TExtraAttrKey>[],
): void {
	for (const attachment of attachments) {
		installRuntimeAttachment(member, attachment);
	}
}
