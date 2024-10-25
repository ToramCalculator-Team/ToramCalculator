import { createSignal } from "solid-js";
import { Character } from "~/repositories/character";
import SankeyChart from "~/components/module/sankeyChart";
import { test } from "~/../test/testData";

export default function AppMainContet() {
  const [dataset, setDataset] = createSignal<Character>(test.member.character);

  return (
    <>
      <SankeyChart character={dataset() ?? []} />
    </>
  );
}
