import { useParams } from "@solidjs/router";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createResource } from "solid-js";
import { Character, findCharacterById } from "~/repositories/character";

export default function CharactePage() {
  const params = useParams();
  const [character, { refetch: refetchCharacter }] = createResource(() => findCharacterById(params.characterId));
  return (<OverlayScrollbarsComponent
        element="div"
        options={{ scrollbars: { autoHide: "scroll" } }}
        defer
        class="h-full w-full"
      > 
      <pre>{JSON.stringify(character(), null, 2)}</pre>
  </OverlayScrollbarsComponent>) ;
}
