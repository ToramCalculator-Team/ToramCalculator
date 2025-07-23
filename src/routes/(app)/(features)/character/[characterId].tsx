import { useParams } from "@solidjs/router";
import { OverlayScrollbarsComponent } from "overlayscrollbars-solid";
import { createResource } from "solid-js";
import { findCharacterWithRelations } from "../../../../../db/repositories/character";

export default function CharactePage() {
  const params = useParams();
  const [character, { refetch: refetchCharacter }] = createResource(() => findCharacterWithRelations(params.characterId));
  return (
    <OverlayScrollbarsComponent
      element="div"
      options={{ scrollbars: { autoHide: "scroll" } }}
      defer
      class="h-full w-full"
    >
      <pre>{JSON.stringify(character.latest, null, 2)}</pre>
    </OverlayScrollbarsComponent>
  );
}
