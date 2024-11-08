import { useParams } from "@solidjs/router";
import { createResource } from "solid-js";
import { Character, findCharacterById } from "~/repositories/character";

export default function CharactePage() {
  const params = useParams();
  const [character, { refetch: refetchCharacter }] = createResource(() => findCharacterById(params.characterId));
  return <pre>{JSON.stringify(character(), null, 2)}</pre>;
}
