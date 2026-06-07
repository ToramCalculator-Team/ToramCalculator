import { selectSimulatorForEngine } from "@db/repositories/simulatorEngine";
import { useParams } from "@solidjs/router";
import { createEffect, createResource, createSignal, on, onCleanup, onMount, Show } from "solid-js";
import { Motion } from "solid-motionone";
import { LoadingBar } from "~/components/controls/loadingBar";
import { RealtimeSimulator } from "~/routes/(app)/(features)/simulator/RealtimeSimulator";
import { store, setStore } from "~/store";

/**
 * 模拟器主页面组件
 */
export default function SimulatorPage() {
	const params = useParams();
	const [simulatorData, { refetch: refetchSimulator }] = createResource(async () => {
		return await selectSimulatorForEngine(params.simulatorId ?? "");
	});

	// 记录用户进入模拟器页面时的3D场景开关状态，以便离开页面时恢复
	const profile3DBgisOpen = store.settings.userInterface.is3DSceneEnabled;

	// 场景模式：打木桩练习（仅配置自身和地方怪物）、完整场景配置
	const [mode, setMode] = createSignal<"practice" | "full">("practice");

	createEffect(
		on(
			() => store.database.tableSyncState.simulator,
			() => {
				if (store.database.tableSyncState.simulator) {
					refetchSimulator();
				}
			},
		),
	);

	createEffect(() => {
		console.log("simulatorData", simulatorData());
	});

	onMount(() => {
		console.log(`--Simulator Page Mount`);
		setStore("settings","userInterface","is3DSceneEnabled", true);
	});

	onCleanup(() => {
		console.log(`--Simulator Page Unmount`);
		// 恢复用户设置的3D场景开关状态（如果之前是开的就继续开，之前是关的就继续关）
		setStore("settings","userInterface","is3DSceneEnabled", profile3DBgisOpen);
	});

	return (
		<Show
			when={store.database.tableSyncState.simulator}
			fallback={
				<Motion.div
					animate={{ opacity: [0, 1] }}
					exit={{ opacity: 0 }}
					transition={{ duration: store.settings.userInterface.isAnimationEnabled ? 0.3 : 0 }}
					class="LoadingState flex h-full w-full flex-col items-center justify-center gap-3"
				>
					<LoadingBar class="w-1/2 min-w-[320px]" />
					<h1 class="animate-pulse">awaiting DB-simulator sync...</h1>
				</Motion.div>
			}
		>
			<Show when={simulatorData()}>
				{(validSimulatorData) => <RealtimeSimulator simulatorData={validSimulatorData()} />}
			</Show>
		</Show>
	);
}
