import { createSignal } from "solid-js";
import { Character, defaultCharacter } from "~/repositories/character";
import SankeyChart from "~/components/module/sankeyChart";

export default function AppMainContet() {
  const [dataset, setDataset] = createSignal<Character>(defaultCharacter);

  return (
    <>
      <SankeyChart character={dataset() ?? []} />
    </>
  );
}
