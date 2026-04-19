import { selectSimulatorByIdWithRelations } from "@db/generated/repositories/simulator";
import { useParams } from "@solidjs/router";
import { createEffect, createResource, createSignal, on, onCleanup, onMount, Show } from "solid-js";
import { Motion } from "solid-motionone";
import { LoadingBar } from "~/components/controls/loadingBar";
import { RealtimeSimulator } from "~/routes/(app)/(features)/simulator/RealtimeSimulator";
import { store } from "~/store";

/**
 * 模拟器主页面组件
 */
export default function SimulatorPage() {
	const params = useParams();
	const [simulatorData, { refetch: refetchSimulator }] = createResource(() =>
		selectSimulatorByIdWithRelations(params.simulatorId ?? ""),
	);

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
	});

	onCleanup(() => {
		console.log(`--Simulator Page Unmount`);
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
