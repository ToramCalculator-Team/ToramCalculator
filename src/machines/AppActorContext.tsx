/**
 * 应用 actor 的 SolidJS provider + 消费 hooks。
 *
 * InterfaceStateMachine 是应用内唯一 AUI actor，同时保存跨模态交互语义与当前
 * Simulator 会话阶段。应用启动就绪由 bootstrap 编排器表达（见 src/lib/bootstrap）。
 * systemId 保留，供场景/其他 actor 通过 actor.system.get() 寻址。
 */

import { fromActorRef } from "@xstate/solid";
import {
	type Accessor,
	createContext,
	createEffect,
	createSignal,
	type JSX,
	onCleanup,
	type ParentProps,
	Show,
	useContext,
} from "solid-js";
import { type Actor, createActor } from "xstate";
import { useBootstrap } from "~/lib/bootstrap/BootstrapContext";
import { getBootstrapValue } from "~/lib/bootstrap/context-standalone";
import {
	type CharacterSessionActorRef,
	type CharacterSessionRuntime,
	createCharacterSessionRuntime,
} from "~/features/character/session/characterSessionMachine";
import type { EngineService } from "~/lib/engine/core/thread/EngineService";
import {
	createSimulatorSessionRuntime,
	type SimulatorSessionActorRef,
	type SimulatorSessionRuntime,
} from "~/features/simulator/simulatorSessionMachine";
import {
	createInterfaceStateMachine,
	type InterfaceStateMachine,
	type InterfaceStateSnapshot,
} from "./interfaceStateMachine";

type InterfaceActor = Actor<InterfaceStateMachine>;

type AppActorContextValue = {
	interfaceActor: InterfaceActor;
	simulatorSessionActor: SimulatorSessionActorRef;
	characterSessionActor: CharacterSessionActorRef;
	simulatorRuntime: SimulatorSessionRuntime;
	characterRuntime: CharacterSessionRuntime;
};

const AppActorCtx = createContext<AppActorContextValue>();

export function AppActorProvider(props: ParentProps): JSX.Element {
	const bootstrap = useBootstrap();
	const engineReady = bootstrap.ready("engine");
	const engineError = bootstrap.error("engine");
	const [value, setValue] = createSignal<AppActorContextValue | null>(null);
	let activeEngineService: EngineService | null = null;

	createEffect(() => {
		if (!engineReady() || value()) return;
		const engineService = getBootstrapValue<EngineService>("engine");
		if (!engineService) throw new Error("bootstrap engine 模块未返回 EngineService");
		const simulatorRuntime = createSimulatorSessionRuntime(engineService);
		const characterRuntime = createCharacterSessionRuntime({ engineService });
		const interfaceActor = createActor(
			createInterfaceStateMachine({
				simulatorSession: simulatorRuntime.machine,
				characterSession: characterRuntime.machine,
			}),
			{ systemId: "interfaceState" },
		);
		interfaceActor.start();
		const simulatorChild = interfaceActor.system.get("simulatorSession");
		const characterChild = interfaceActor.system.get("characterSession");
		if (!simulatorChild || !characterChild) {
			interfaceActor.stop();
			throw new Error("应用 Session child actor 启动失败");
		}
		// 两个 systemId 与本组合根注入的 logic 一一对应，因此只在这里收窄通用 ActorRef。
		const simulatorSessionActor = simulatorChild as SimulatorSessionActorRef;
		const characterSessionActor = characterChild as CharacterSessionActorRef;
		activeEngineService = engineService;
		setValue({
			interfaceActor,
			simulatorSessionActor,
			characterSessionActor,
			simulatorRuntime,
			characterRuntime,
		});

		if (import.meta.env.DEV) {
			interfaceActor.subscribe((snapshot) => {
				console.debug("[InterfaceState]", snapshot.value, snapshot.context);
			});
		}
	});

	onCleanup(() => {
		value()?.interfaceActor.stop();
		if (activeEngineService) void activeEngineService.shutdown();
		activeEngineService = null;
	});

	return (
		<Show
			when={value()}
			fallback={
				<Show when={engineError()}>
					{(error) => <p class="text-danger-color p-6">EngineService 启动失败：{error().message}</p>}
				</Show>
			}
		>
			{(runtime) => <AppActorCtx.Provider value={runtime()}>{props.children}</AppActorCtx.Provider>}
		</Show>
	);
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

/** AUI actor system 中常驻的 SimulatorSession child。 */
export function useSimulatorSessionActor(): SimulatorSessionActorRef {
	const ctx = useContext(AppActorCtx);
	if (!ctx) throw new Error("useSimulatorSessionActor must be used within AppActorProvider");
	return ctx.simulatorSessionActor;
}

/** AUI actor system 中常驻的 CharacterSession child。 */
export function useCharacterSessionActor(): CharacterSessionActorRef {
	const ctx = useContext(AppActorCtx);
	if (!ctx) throw new Error("useCharacterSessionActor must be used within AppActorProvider");
	return ctx.characterSessionActor;
}

/** SimulatorSession 自有实时租约的只读运行投影。 */
export function useSimulatorSessionRuntime(): SimulatorSessionRuntime {
	const ctx = useContext(AppActorCtx);
	if (!ctx) throw new Error("useSimulatorSessionRuntime must be used within AppActorProvider");
	return ctx.simulatorRuntime;
}

/** CharacterSession 内部 live projection，仅供统一 facade 装配。 */
export function useCharacterSessionRuntime(): CharacterSessionRuntime {
	const ctx = useContext(AppActorCtx);
	if (!ctx) throw new Error("useCharacterSessionRuntime must be used within AppActorProvider");
	return ctx.characterRuntime;
}
