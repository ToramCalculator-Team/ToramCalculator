/**
 * 应用生命周期机 + 业务阶段机。
 *
 * AppMachine（生命周期机）：
 *   initializing → ready
 *   ready 状态 invoke BusinessPhaseMachine。
 *
 * BusinessPhaseMachine（业务阶段机）：
 *   designing | simulating | analyzing
 *   三态互斥切换，由用户显式触发（"开始模拟"/"查看分析"/"回到设计"）。
 *   当前不绑定路由/UI/动画——等路由设计确定后再接入。
 *
 * 架构说明：
 *   [设计-验证-分析] 是模拟器的核心业务流，但具体设计内容（装备槽、技能树等）
 *   取决于游戏 schema。项目级架构（生命周期、阶段、注意力、渲染）未来需要
 *   与游戏特定业务层解耦，使本项目可服务于多种游戏。当前先做分层命名。
 */

import { type ActorRefFrom, type SnapshotFrom, setup } from "xstate";

// ─── 业务阶段机 ───────────────────────────────────────────────────────────────

export type Phase = "designing" | "simulating" | "analyzing";

export type BusinessPhaseEvent =
	| { type: "START_SIMULATION" }
	| { type: "START_ANALYSIS" }
	| { type: "BACK_TO_DESIGN" };

export const createBusinessPhaseMachine = () => {
	const machineSetup = setup({
		types: {
			events: {} as BusinessPhaseEvent,
		},
	});

	return machineSetup.createMachine({
		id: "businessPhase",
		initial: "designing",
		states: {
			designing: {
				entry: () => {
					if (import.meta.env.DEV) console.debug("[BusinessPhase] → designing");
				},
				on: {
					START_SIMULATION: { target: "simulating" },
					START_ANALYSIS: { target: "analyzing" },
				},
			},
			simulating: {
				entry: () => {
					if (import.meta.env.DEV) console.debug("[BusinessPhase] → simulating");
				},
				on: {
					BACK_TO_DESIGN: { target: "designing" },
					START_ANALYSIS: { target: "analyzing" },
				},
			},
			analyzing: {
				entry: () => {
					if (import.meta.env.DEV) console.debug("[BusinessPhase] → analyzing");
				},
				on: {
					BACK_TO_DESIGN: { target: "designing" },
					START_SIMULATION: { target: "simulating" },
				},
			},
		},
	});
};

export type BusinessPhaseMachine = ReturnType<typeof createBusinessPhaseMachine>;

// ─── 应用生命周期机 ───────────────────────────────────────────────────────────

export type AppMachineEvent =
	| BusinessPhaseEvent; // 业务事件透传到子机器

export const createAppMachine = () => {
	const businessPhaseMachine = createBusinessPhaseMachine();

	const machineSetup = setup({
		types: {
			events: {} as AppMachineEvent,
		},
		actors: { businessPhaseMachine },
	});

	return machineSetup.createMachine({
		id: "app",
		initial: "initializing",
		states: {
			initializing: {
				// 当前业务机无异步依赖，直接进入 ready。
				// 未来扩展点：可在此等待 session 确认、最小资源就绪等。
				always: { target: "ready" },
				entry: () => {
					if (import.meta.env.DEV) console.debug("[App] initializing…");
				},
			},
			ready: {
				entry: () => {
					if (import.meta.env.DEV) console.debug("[App] ready → invoke businessPhase");
				},
				invoke: {
					src: "businessPhaseMachine",
					systemId: "businessPhase",
				},
			},
		},
	});
};

export type AppMachine = ReturnType<typeof createAppMachine>;
export type AppActorRef = ActorRefFrom<AppMachine>;
export type AppSnapshot = SnapshotFrom<AppMachine>;
