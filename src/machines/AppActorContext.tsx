/**
 * 应用 actor 的 SolidJS provider + 消费 hooks。
 *
 * - BusinessPhaseMachine（业务阶段机）：designing | simulating | analyzing。
 * - VisualIntentMachine（注意力机）：阶段无关，跨阶段存活。
 *
 * 二者平级，都是本 provider 直接创建的顶层 actor，互不 invoke。
 * 应用启动就绪由 bootstrap 编排器表达（见 src/lib/bootstrap），不经状态机。
 * systemId 保留，供场景/其他 actor 通过 actor.system.get() 寻址。
 */

import { type Accessor, createContext, type JSX, onCleanup, type ParentProps, useContext } from "solid-js";
import { fromActorRef } from "@xstate/solid";
import { type Actor, createActor } from "xstate";
import { type BusinessPhaseMachine, createBusinessPhaseMachine } from "./businessPhaseMachine";
import { createVisualIntentMachine, type VisualIntentMachine, type VisualIntentSnapshot } from "./intent/visualIntentMachine";

type BusinessActor = Actor<BusinessPhaseMachine>;
type IntentActor = Actor<VisualIntentMachine>;

type AppActorContextValue = {
	businessActor: BusinessActor;
	intentActor: IntentActor;
};

const AppActorCtx = createContext<AppActorContextValue>();

export function AppActorProvider(props: ParentProps): JSX.Element {
	const businessActor = createActor(createBusinessPhaseMachine(), { systemId: "businessPhase" });
	businessActor.start();

	const intentActor = createActor(createVisualIntentMachine(), { systemId: "visualIntent" });
	intentActor.start();

	// Dev 日志
	if (import.meta.env.DEV) {
		businessActor.subscribe((snapshot) => {
			console.debug("[BusinessPhase]", snapshot.value);
		});
		intentActor.subscribe((snapshot) => {
			console.debug("[visualIntent]", snapshot.value, {
				target: snapshot.context.target,
				operation: snapshot.context.operation,
			});
		});
	}

	onCleanup(() => {
		businessActor.stop();
		intentActor.stop();
	});

	return <AppActorCtx.Provider value={{ businessActor, intentActor }}>{props.children}</AppActorCtx.Provider>;
}

/** 业务阶段机 actor。 */
export function useBusinessPhase(): BusinessActor {
	const ctx = useContext(AppActorCtx);
	if (!ctx) {
		throw new Error("useBusinessPhase must be used within AppActorProvider");
	}
	return ctx.businessActor;
}

/** 注意力机 actor。 */
export function useVisualIntent(): IntentActor {
	const ctx = useContext(AppActorCtx);
	if (!ctx) {
		throw new Error("useVisualIntent must be used within AppActorProvider");
	}
	return ctx.intentActor;
}

/** 注意力机快照（reactive accessor）。 */
export function useIntentSnapshot(): Accessor<VisualIntentSnapshot> {
	const intentActor = useVisualIntent();
	return fromActorRef(intentActor);
}
