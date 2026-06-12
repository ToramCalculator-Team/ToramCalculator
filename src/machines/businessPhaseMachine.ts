/**
 * 业务阶段机（BusinessPhaseMachine）。
 *
 *   designing | simulating | analyzing
 *   三态互斥切换，由用户显式触发（"开始模拟"/"查看分析"/"回到设计"）。
 *   当前不绑定路由/UI/动画——等路由设计确定后再接入。
 *
 * 架构说明：
 *   [设计-验证-分析] 是模拟器的核心业务流，与注意力机（VisualIntentMachine）平级，
 *   二者都是 AppActorProvider 直接持有的顶层 actor，互不 invoke。
 *   应用启动就绪由 bootstrap 编排器（src/lib/bootstrap）表达，不由状态机承载——
 *   并发依赖 DAG 调度不是状态转移问题，手写编排器比状态机更贴合。
 *
 *   具体设计内容（装备槽、技能树等）取决于游戏 schema。项目级架构（阶段、注意力、
 *   渲染）未来需要与游戏特定业务层解耦，使本项目可服务于多种游戏。当前先做分层命名。
 */

import { type ActorRefFrom, setup } from "xstate";

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
export type BusinessPhaseActorRef = ActorRefFrom<BusinessPhaseMachine>;
