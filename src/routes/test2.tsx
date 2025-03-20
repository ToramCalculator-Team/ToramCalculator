import { createResource, createSignal, For } from "solid-js";
import { findMobById, findMobs } from "~/repositories/mob";
import Button from "~/components/controls/button";

function App() {
  const [mobId, setMobId] = createSignal("clv6uxjlm000xwv1fb3g0tjv4");
  const [mobs, { refetch: refetchMobs }] = createResource(findMobs);
  const [mob, { refetch: refetchMob }] = createResource(() => mobId(), findMobById);

  return (
    <div
      class="z-50 h-full w-full"
      style={{ "background-color": `rgb(${255 * Math.random()} ${255 * Math.random()} ${255 * Math.random()})` }}
    >
      <div class="Content flex flex-1 flex-wrap gap-3 rounded p-6">
        <For each={mobs()}>
          {(mob, index) => {
            return (
              <Button
                onClick={() => {
                  setMobId(mob.id);
                }}
              >
                {mob.name}
              </Button>
            );
          }}
        </For>
      </div>
      <h1>{mobId()}</h1>
      <pre class="bg-primary-color">{mob()?.name}</pre>
    </div>
  );
}

export default App;
