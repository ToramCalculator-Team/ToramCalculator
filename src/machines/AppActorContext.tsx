/**
 * 应用 actor 的 SolidJS provider + 消费 hooks。
 *
 * - AppMachine（生命周期机）：initializing → ready，ready 时 invoke BusinessPhaseMachine。
 * - BusinessPhaseMachine（业务阶段机）：designing | simulating | analyzing，通过 system.get 取得。
 * - VisualIntentMachine（注意力机）：独立创建，与 AppMachine 平级。
 *
 * 等路由设计确定后，再决定注意力机归属和路由绑定方式。
 */

import { type Accessor, createContext, type JSX, onCleanup, type ParentProps, useContext } from "solid-js";
import { fromActorRef } from "@xstate/solid";
import { type Actor, type ActorRefFrom, createActor } from "xstate";
import { type AppMachine, type BusinessPhaseMachine, createAppMachine } from "./appMachine";
import { createVisualIntentMachine, type VisualIntentMachine, type VisualIntentSnapshot } from "./intent/visualIntentMachine";

type AppActor = Actor<AppMachine>;
type IntentActor = Actor<VisualIntentMachine>;
type BusinessPhaseActorRef = ActorRefFrom<BusinessPhaseMachine>;

type AppActorContextValue = {
	appActor: AppActor;
	intentActor: IntentActor;
};

const AppActorCtx = createContext<AppActorContextValue>();

export function AppActorProvider(props: ParentProps): JSX.Element {
	const appActor = createActor(createAppMachine(), { systemId: "app" });
	appActor.start();

	const intentActor = createActor(createVisualIntentMachine(), { systemId: "visualIntent" });
	intentActor.start();

	// Dev 日志
	if (import.meta.env.DEV) {
		appActor.subscribe((snapshot) => {
			console.debug("[App]", snapshot.value);
		});
		intentActor.subscribe((snapshot) => {
			console.debug("[visualIntent]", snapshot.value, {
				target: snapshot.context.target,
				operation: snapshot.context.operation,
			});
		});
	}

	onCleanup(() => {
		appActor.stop();
		intentActor.stop();
	});

	return <AppActorCtx.Provider value={{ appActor, intentActor }}>{props.children}</AppActorCtx.Provider>;
}

/** 生命周期机 actor。 */
export function useAppActor(): AppActor {
	const ctx = useContext(AppActorCtx);
	if (!ctx) {
		throw new Error("useAppActor must be used within AppActorProvider");
	}
	return ctx.appActor;
}

/** 业务阶段机 actor（由 AppMachine invoke，通过 system 取得）。 */
export function useBusinessPhase(): BusinessPhaseActorRef {
	const appActor = useAppActor();
	const ref = appActor.system.get("businessPhase") as BusinessPhaseActorRef | undefined;
	if (!ref) {
		throw new Error("businessPhase actor not available; AppMachine may not be in ready state");
	}
	return ref;
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
