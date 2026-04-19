/**
 * 雷吉斯托环 (registlet) 数据驱动加载器。
 *
 * 入口：`installRegistlet(member, registlet, level)` / `uninstallRegistlet(member, registletId)`。
 *
 * 根据 `registlet` 的五块数据依次挂到 member：
 *  - attrModifiers          → StatContainer.addModifier（沿用 PrebattleDataSysModifiers 行为；第一版不重复实现，留给 PrebattleModifiers 处理）
 *  - pipelinePatches        → Member.pipelineOverlays（支持 `insertInstructions` step）
 *  - skillBranchActivators  → 第一版占位（skill 分支系统尚未对接）
 *  - subscriptions          → Member.procBus.subscribeByName
 *  - thresholdWatchers      → Member.attributeWatchers.watch
 *
 * 所有注册统一用 sourceId = `registlet.<registletId>[.<细分后缀>]`，卸载时按前缀一次清理。
 *
 * 设计要点：
 * - 数据中的 `{level}` / `{levelRate}` 占位符由 loader 在安装时替换为字面值；写进 overlay 的指令
 *   和 modifier 的 value 都能用。
 * - handler.value 为表达式：通过 `ExpressionEvaluator` 在触发时求值，可引用 `self.*` 与 `level`。
 *   没有求值器时退化为 number 直接使用。
 *
 * 术语：请区分 `registlet`（托环）与 `passive skill`（被动技能）。见同目录 `types.ts`。
 */

import type {
	EventSubscriptionEffect,
	PipelineInstructionData,
	PipelinePatchEffect,
	RegistletHandler,
	RegistletValue,
	ThresholdWatcherEffect,
} from "@db/schema/jsons";
import { createLogger } from "~/lib/Logger";
import type { ExpressionContext } from "../../../JSProcessor/types";
import type { PipelineInstruction } from "../../../Pipeline/instruction";
import type { PipelineOverlay } from "../../../Pipeline/overlay";
import { type ModifierSource, ModifierType } from "../runtime/StatContainer/StatContainer";
import { removeOverlaysBySourceId } from "./overlayUtils"; 
import type { AnyMember } from "./types";

const log = createLogger("RegistletLoader");

/** 最小 registlet 行形状。与 `db/generated/zod/index.ts#registlet` 兼容。 */
export interface RegistletRow {
	id: string;
	name: string;
	maxLevel: number;
	attrModifiers: string[];
	pipelinePatches: readonly PipelinePatchEffect[];
	skillBranchActivators: readonly unknown[];
	subscriptions: readonly EventSubscriptionEffect[];
	thresholdWatchers: readonly ThresholdWatcherEffect[];
}

const REGISTLET_SOURCE_PREFIX = "registlet";

function sourceIdOf(registletId: string, suffix?: string): string {
	return suffix
		? `${REGISTLET_SOURCE_PREFIX}.${registletId}.${suffix}`
		: `${REGISTLET_SOURCE_PREFIX}.${registletId}`;
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
 * 关键：替换完成后若字符串能解析为有限数字，**转为 number 字面量**。
 * Pipeline compiler 的 `resolveOperand` 对纯数字字符串不会识别为字面量
 * （会去 vars / input 里找不到后 fallback 到 0），把 level/levelRate 提前转数字能避免这个陷阱。
 *
 * 非数字字符串（例如"self"、"hp.max"等标识符）保持 string，走 compiler 既有解析路径。
 */
function substituteInstructionOperand(
	op: string | number | undefined,
	level: number,
): string | number | undefined {
	if (op === undefined) return undefined;
	if (typeof op === "number") return op;
	const replaced = substituteLevel(op, level);
	if (typeof replaced === "boolean") return replaced ? 1 : 0;
	if (typeof replaced === "number") return replaced;
	// string：若是纯数字字面量（可能由占位符替换得到）则转 number。
	const trimmed = replaced.trim();
	if (trimmed.length > 0) {
		const asNum = Number(trimmed);
		if (Number.isFinite(asNum)) return asNum;
	}
	return replaced;
}

function mapModifierType(type: "dynamicFixed" | "dynamicPercentage" | "staticFixed" | "staticPercentage"): ModifierType {
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

/**
 * 把 jsons.ts 里的 PipelineInstructionData 转成引擎 Pipeline 的 PipelineInstruction。
 * `op` 字段只是类型拓宽，不在此处做白名单校验。
 */
function buildInstruction(data: PipelineInstructionData, level: number): PipelineInstruction {
	return {
		target: data.target,
		op: data.op as PipelineInstruction["op"],
		a: substituteInstructionOperand(data.a, level) as PipelineInstruction["a"],
		b: substituteInstructionOperand(data.b, level),
	};
}

/**
 * 把 `PipelinePatchEffect` 转成 `PipelineOverlay`。
 * 仅支持 `insertInstructions` step；其他 step 类型（setValue / runPipeline / ...）暂跳过并告警。
 */
function buildOverlayFromPatch(patch: PipelinePatchEffect, sourceId: string, level: number): PipelineOverlay | null {
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
		sourceType: "registlet",
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

/**
 * handler value 求值：支持字符串表达式 / 数字 / 布尔；表达式先做 {level} 替换再交给 evaluator。
 */
function evaluateHandlerValue(
	value: RegistletValue,
	member: AnyMember,
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
		currentFrame: member.runtime.currentFrame,
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

/**
 * 执行一组 handler。eventCtx 是事件触发时的上下文（frame / 事件 payload 摘要等），
 * 用于构造 modifier sourceId 和表达式求值的 extra ctx。
 */
function runHandlers(
	handlers: readonly RegistletHandler[],
	member: AnyMember,
	registletId: string,
	level: number,
	eventCtx: { frame: number; eventName?: string },
): void {
	for (const handler of handlers) {
		try {
			switch (handler.type) {
				case "addModifier": {
					const value = evaluateHandlerValue(handler.value, member, level);
					const suffix = handler.lifetime === "bySource"
						? (handler.sourceIdSuffix ?? "default")
						: `${handler.sourceIdSuffix ?? "once"}.${eventCtx.frame}`;
					const source: ModifierSource = {
						id: sourceIdOf(registletId, suffix),
						name: handler.attribute,
						type: "registlet",
					};
					member.statContainer.addModifier(
						handler.attribute,
						mapModifierType(handler.modifierType),
						value,
						source,
					);
					break;
				}
				case "removeModifierBySource": {
					const sid = sourceIdOf(registletId, handler.sourceIdSuffix);
					// addModifier 的 handler 默认写入 dynamic 通道；精确移除需枚举四种 ModifierType 尝试。
					// 简化：跨四种 type 都 removeModifier 一次；未命中的会在 StatContainer 内静默 no-op。
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
					bus.emit(handler.eventName, payload, eventCtx.frame);
					break;
				}
			}
		} catch (error) {
			log.error(
				`handler 执行抛错 (registlet=${registletId}, handler=${handler.type}, event=${eventCtx.eventName})`,
				error,
			);
		}
	}
}

/** 获取本成员当前帧（带 service 兜底）。 */
function currentFrameOf(member: AnyMember): number {
	try {
		return member.services.getCurrentFrame();
	} catch {
		return member.runtime.currentFrame;
	}
}

/**
 * 安装一条 registlet 到成员。
 *
 * 注意：同 id 重复安装会先清理旧条目。
 */
export function installRegistlet(member: AnyMember, registlet: RegistletRow, level: number): void {
	const clampedLevel = Math.max(0, Math.min(level, registlet.maxLevel));
	uninstallRegistlet(member, registlet.id);

	// 1. pipelinePatches → overlay
	for (const patch of registlet.pipelinePatches) {
		const overlay = buildOverlayFromPatch(patch, sourceIdOf(registlet.id), clampedLevel);
		if (overlay) {
			member.pipelineOverlays.push(overlay);
		}
	}

	// 2. subscriptions → procBus
	if (registlet.subscriptions.length > 0) {
		if (!member.procBus) {
			log.warn(`installRegistlet: ProcBus 未就绪，subscriptions 无法安装 (registlet=${registlet.id})`);
		} else {
			for (const sub of registlet.subscriptions) {
				const tagFilter = new Set(sub.requiredDamageTags);
				const statusFilter = new Set(sub.requiredStatusTypes);
				const predicate = tagFilter.size === 0 && statusFilter.size === 0
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
				member.procBus.subscribeByName(
					sourceIdOf(registlet.id),
					sub.eventNames,
					predicate,
					(event) => {
						runHandlers(sub.handlers, member, registlet.id, clampedLevel, {
							frame: event.frame,
							eventName: event.name,
						});
					},
				);
			}
		}
	}

	// 3. thresholdWatchers → attributeWatchers
	for (const watcher of registlet.thresholdWatchers) {
		const thresholdValue = evaluateHandlerValue(watcher.threshold, member, clampedLevel);
		let lastFiredFrame = Number.NEGATIVE_INFINITY;
		member.attributeWatchers.watch(
			sourceIdOf(registlet.id),
			watcher.path,
			thresholdValue,
			watcher.direction,
			(ctx) => {
				const frame = currentFrameOf(member);
				if (watcher.cooldownFrames > 0 && frame - lastFiredFrame < watcher.cooldownFrames) {
					return;
				}
				lastFiredFrame = frame;
				runHandlers(watcher.handlers, member, registlet.id, clampedLevel, {
					frame,
					eventName: `threshold:${watcher.path}:${ctx.direction}`,
				});
			},
			{ fireOnRegister: watcher.fireOnRegister },
		);
	}

	// 4. attrModifiers / skillBranchActivators：当前由其他模块处理 / 暂未接入。
	//    attrModifiers 沿用 PrebattleDataSysModifiers 的解析路径；不在此重复实现。
}

/** 卸载一条 registlet。按 sourceId 清理 overlay / 订阅 / watcher / modifier。 */
export function uninstallRegistlet(member: AnyMember, registletId: string): void {
	const baseSourceId = sourceIdOf(registletId);
	removeOverlaysBySourceId(member, baseSourceId);
	member.procBus?.unsubscribeBySource(baseSourceId);
	member.attributeWatchers.unwatchBySource(baseSourceId);
	// base 自身 + 所有 `registlet.<id>.<suffix>` 前缀的 modifier 一次性清理。
	member.statContainer.removeModifiersBySourceIdPrefix(baseSourceId);
}
