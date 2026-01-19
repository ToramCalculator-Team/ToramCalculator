import { selectSimulatorByIdWithRelations } from "@db/generated/repositories/simulator";
import { useParams } from "@solidjs/router";
import { createResource, onCleanup, onMount, Show } from "solid-js";
import { LoadingBar } from "~/components/controls/loadingBar";
import { RealtimeSimulator } from "~/routes/(app)/simulator/RealtimeSimulator";

/**
 * 模拟器主页面组件
 */
export default function SimulatorPage() {
	const params = useParams();
	const [simulatorData, { refetch: refetchSimulator }] = createResource(() =>
		selectSimulatorByIdWithRelations(params.simulatorId ?? ""),
	);

	// createEffect(() => {
	//   console.log("simulatorData", simulatorData());
	// });

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
