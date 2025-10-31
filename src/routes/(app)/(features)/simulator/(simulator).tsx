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
