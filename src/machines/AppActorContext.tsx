/**
 * 应用 actor 的 SolidJS provider + 消费 hooks。
 *
 * - BusinessPhaseMachine（待迁移的 simulator 业务阶段机）：designing | simulating | analyzing。
 * - InterfaceStateMachine（AUI 行为状态机）：跨模态共享交互语义。
 *
 * 二者平级，都是本 provider 直接创建的顶层 actor，互不 invoke。
 * 应用启动就绪由 bootstrap 编排器表达（见 src/lib/bootstrap），不经状态机。
 * systemId 保留，供场景/其他 actor 通过 actor.system.get() 寻址。
 */

import { fromActorRef } from "@xstate/solid";
import { type Accessor, createContext, type JSX, onCleanup, type ParentProps, useContext } from "solid-js";
import { type Actor, createActor } from "xstate";
import { type BusinessPhaseMachine, createBusinessPhaseMachine } from "./businessPhaseMachine";
import {
	createInterfaceStateMachine,
	type InterfaceStateMachine,
	type InterfaceStateSnapshot,
} from "./interfaceStateMachine";

type BusinessActor = Actor<BusinessPhaseMachine>;
type InterfaceActor = Actor<InterfaceStateMachine>;

type AppActorContextValue = {
	businessActor: BusinessActor;
	interfaceActor: InterfaceActor;
};

const AppActorCtx = createContext<AppActorContextValue>();

export function AppActorProvider(props: ParentProps): JSX.Element {
	const businessActor = createActor(createBusinessPhaseMachine(), { systemId: "businessPhase" });
	businessActor.start();

	const interfaceActor = createActor(createInterfaceStateMachine(), { systemId: "interfaceState" });
	interfaceActor.start();

	// Dev 日志
	if (import.meta.env.DEV) {
		businessActor.subscribe((snapshot) => {
			console.debug("[BusinessPhase]", snapshot.value);
		});
		interfaceActor.subscribe((snapshot) => {
			console.debug("[InterfaceState]", snapshot.value, snapshot.context);
		});
	}

	onCleanup(() => {
		businessActor.stop();
		interfaceActor.stop();
	});

	return <AppActorCtx.Provider value={{ businessActor, interfaceActor }}>{props.children}</AppActorCtx.Provider>;
}

/** 业务阶段机 actor。 */
export function useBusinessPhase(): BusinessActor {
	const ctx = useContext(AppActorCtx);
	if (!ctx) {
		throw new Error("useBusinessPhase must be used within AppActorProvider");
	}
	return ctx.businessActor;
}

/** AUI 行为状态机 actor。 */
export function useInterfaceActor(): InterfaceActor {
	const ctx = useContext(AppActorCtx);
	if (!ctx) {
		throw new Error("useInterfaceActor must be used within AppActorProvider");
	}
	return ctx.interfaceActor;
}

/** AUI 行为状态快照（reactive accessor）。 */
export function useInterfaceSnapshot(): Accessor<InterfaceStateSnapshot> {
	const interfaceActor = useInterfaceActor();
	return fromActorRef(interfaceActor);
}
