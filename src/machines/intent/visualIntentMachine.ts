/**
 * 视觉意图机（注意力机）。零 deps、零副作用——纯状态转移，可独立测试。
 *
 * 见 docs/decisions/0012-intent-first-visual-control.md
 *
 * 注意力生命周期（目标无关，五状态）：
 *   atRest ──ATTEND──▶ acquiring ──settle/超时──▶ attending ──ENGAGE──▶ engaging
 *     ▲                   │  ▲                       │                    │
 *     └──── releasing ◀───┴──┴──── 新 ATTEND 自打断 ──┴──── RELEASE ───────┘
 *
 * 五条不变量（ADR 0012）在此机器内的落点：
 *  - #1 单一写者：意图状态只由本机器改。
 *  - #4 用户主权：ATTEND/ENGAGE 无条件抢占进行中的 acquiring（reenter），永不排队。
 *  - #5 回执建议性：SETTLED 驱动推进，但缺失/迟到由 after:1000 兜底，绝不卡死。
 *
 * 阶段感知已移除：注意力机是阶段内部私有资源，合法性由 Target 词汇自然限定。
 */

import { type ActorRefFrom, type SnapshotFrom, assign, setup } from "xstate";
import { type IntentSource, type Operation, type Target, targetEquals } from "./types";

export type VisualIntentContext = {
	target: Target | null;
	operation: Operation;
	source: IntentSource;
};

export type VisualIntentEvent =
	| { type: "ATTEND"; target: Target; source: IntentSource }
	| { type: "ENGAGE"; target?: Target; source: IntentSource }
	| { type: "RELEASE"; source: IntentSource }
	| { type: "SETTLED"; target: Target };

/** ENGAGE 的目标解析：事件带 target 用之，否则沿用当前 context.target。 */
const resolveEngageTarget = (context: VisualIntentContext, event: VisualIntentEvent): Target | null => {
	if (event.type !== "ENGAGE") return null;
	return event.target ?? context.target;
};

/**
 * engage 合法性：仅 equipmentSlot 和 skillTree 可被操纵。
 * 其余 target（simEntity/timelineEvent 等）当前只支持 inspect。
 */
const canEngageTarget = (target: Target | null): boolean => {
	if (!target) return false;
	return target.kind === "equipmentSlot" || target.kind === "skillTree";
};

export const createVisualIntentMachine = () => {
	const machineSetup = setup({
		types: {
			context: {} as VisualIntentContext,
			events: {} as VisualIntentEvent,
		},
		guards: {
			isOpEngage: ({ context }) => context.operation === "engage",
			// ATTEND 无条件合法（任何 target 都可检视）。
			canAttend: ({ event }) => event.type === "ATTEND",
			// ENGAGE 合法性：target 种类允许操纵。
			canEngage: ({ context, event }) => {
				const target = resolveEngageTarget(context, event);
				return canEngageTarget(target);
			},
			// 抢占判定：异 target。
			attendDifferent: ({ context, event }) =>
				event.type === "ATTEND" && !targetEquals(context.target, event.target),
			// SETTLED 回执匹配当前 target（迟到/错位回执被忽略）。
			settledMatchesEngage: ({ context, event }) =>
				event.type === "SETTLED" && targetEquals(context.target, event.target) && context.operation === "engage",
			settledMatches: ({ context, event }) => event.type === "SETTLED" && targetEquals(context.target, event.target),
		},
		actions: {
			setAttend: assign(({ context, event }) =>
				event.type === "ATTEND"
					? { target: event.target, operation: "inspect" as Operation, source: event.source }
					: context,
			),
			setEngage: assign(({ context, event }) =>
				event.type === "ENGAGE"
					? { target: event.target ?? context.target, operation: "engage" as Operation, source: event.source }
					: context,
			),
			clearContext: assign({
				target: () => null,
				operation: () => "inspect" as Operation,
				source: () => "system" as IntentSource,
			}),
		},
	});

	return machineSetup.createMachine({
		id: "visualIntent",
		initial: "atRest",
		context: { target: null, operation: "inspect", source: "system" },
		states: {
			atRest: {
				on: {
					ATTEND: { guard: "canAttend", target: "acquiring", actions: "setAttend" },
					ENGAGE: { guard: "canEngage", target: "acquiring", actions: "setEngage" },
				},
			},
			// 在途对焦：等场景回执 SETTLED；超时兜底；新意图抢占。
			acquiring: {
				after: {
					1000: [
						{ guard: "isOpEngage", target: "engaging" },
						{ target: "attending" },
					],
				},
				on: {
					SETTLED: [
						{ guard: "settledMatchesEngage", target: "engaging" },
						{ guard: "settledMatches", target: "attending" },
					],
					ATTEND: { guard: "canAttend", target: "acquiring", reenter: true, actions: "setAttend" },
					ENGAGE: { guard: "canEngage", target: "acquiring", reenter: true, actions: "setEngage" },
					RELEASE: { target: "releasing" },
				},
			},
			attending: {
				on: {
					ENGAGE: { guard: "canEngage", target: "engaging", actions: "setEngage" },
					ATTEND: { guard: "attendDifferent", target: "acquiring", reenter: true, actions: "setAttend" },
					RELEASE: { target: "releasing" },
				},
			},
			engaging: {
				on: {
					ATTEND: { guard: "attendDifferent", target: "acquiring", reenter: true, actions: "setAttend" },
					RELEASE: { target: "releasing" },
				},
			},
			// 释放对焦：等回执/超时回 atRest 并清空；中途新意图可抢占。
			releasing: {
				after: { 1000: { target: "atRest", actions: "clearContext" } },
				on: {
					SETTLED: { target: "atRest", actions: "clearContext" },
					ATTEND: { guard: "canAttend", target: "acquiring", actions: "setAttend" },
				},
			},
		},
	});
};

export type VisualIntentMachine = ReturnType<typeof createVisualIntentMachine>;
export type VisualIntentActorRef = ActorRefFrom<VisualIntentMachine>;
export type VisualIntentSnapshot = SnapshotFrom<VisualIntentMachine>;
