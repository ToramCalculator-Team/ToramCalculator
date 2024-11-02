import { createSignal } from "solid-js";
import { Character } from "~/repositories/character";
import SankeyChart from "~/components/module/sankeyChart";
import { test } from "~/../test/testData";
// import { generateCharacterStatus } from "~/../test/characterData";

export default function AppMainContet() {
  const [dataset, setDataset] = createSignal<Character>(test.member.character);
  console.log("dataset");
  // generateCharacterStatus(dataset());

  return (
    <>
      {/* <SankeyChart character={dataset() ?? []} /> */}
    </>
  );
}
