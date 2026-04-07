import { selectSimulatorByIdWithRelations } from "@db/generated/repositories/simulator";
import { useParams } from "@solidjs/router";
import { createEffect, createResource, createSignal, onCleanup, onMount, Show } from "solid-js";
import { LoadingBar } from "~/components/controls/loadingBar";
import { RealtimeSimulator } from "~/routes/(app)/(features)/simulator/RealtimeSimulator";

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
			when={simulatorData()}
			fallback={
				<div class="LoadingState flex h-full w-full flex-col items-center justify-center gap-3">
					<LoadingBar class="w-1/2 min-w-[320px]" />
					<h1 class="animate-pulse">Loading Simulator Data...</h1>
				</div>
			}
		>
			{(validSimulatorData) => <RealtimeSimulator simulatorData={validSimulatorData()} />}
		</Show>
	);
}
