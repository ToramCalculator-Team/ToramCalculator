import { useParams } from "@solidjs/router";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createResource } from "solid-js";
import { findSimulatorWithRelations } from "@db/repositories/simulator";

export default function CharactePage() {
  const params = useParams();
  const [simulator, { refetch: refetchSimulator }] = createResource(() => findSimulatorWithRelations(params.simulatorId));
  return (
    <OverlayScrollbarsComponent
      element="div"
      options={{ scrollbars: { autoHide: "scroll" } }}
      defer
      class="h-full w-full"
    >
      <pre>{JSON.stringify(simulator.latest, null, 2)}</pre>
    </OverlayScrollbarsComponent>
  );
}
