import { useParams } from "@solidjs/router";
import { createEffect, createResource, createSignal } from "solid-js";
import { Character, findCharacterById } from "~/repositories/character";

export default function CharactePage() {
  const params = useParams();
  const [characterFetcher, { refetch: refetchCharacter }] = createResource(() => findCharacterById(params.characterId));
  const [character, setCharacter] = createSignal<Character | null>(null);
  createEffect(() => {
    console.log("character");
    const newCharacter = characterFetcher();
    newCharacter && setCharacter(newCharacter);
  });
  return <pre>{JSON.stringify(character(), null, 2)}</pre>;
}