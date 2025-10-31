// import { useParams } from "@solidjs/router";
// import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
// import { createResource } from "solid-js";
// import { selectSimulatorByIdWithRelations } from "@db/generated/repositories/simulator";

// export default function CharactePage() {
//   const params = useParams();
//   const [simulator, { refetch: refetchSimulator }] = createResource(() => selectSimulatorByIdWithRelations(params.simulatorId));
//   return (
//     <OverlayScrollbarsComponent
//       element="div"
//       options={{ scrollbars: { autoHide: "scroll" } }}
//       defer
//       class="h-full w-full"
//     >
//       <pre>{JSON.stringify(simulator.latest, null, 2)}</pre>
//     </OverlayScrollbarsComponent>
//   );
// }

import { selectSimulatorByIdWithRelations } from "@db/generated/repositories/simulator";
import { createResource, Show } from "solid-js";
import RealtimeSimulator from "~/components/features/simulator/RealtimeSimulator";
import { useParams } from "@solidjs/router";

/**
 * 模拟器主页面组件
 */
export default function SimulatorPage() {
  const params = useParams();
  const [simulatorData, { refetch: refetchSimulator }] = createResource(() =>
    selectSimulatorByIdWithRelations(params.simulatorId),
  );
  return (
    <Show when={simulatorData()} fallback={<div>Loading...</div>}>
      {(validSimulatorData) => <RealtimeSimulator simulatorData={validSimulatorData()} />}
    </Show>
  );
}

