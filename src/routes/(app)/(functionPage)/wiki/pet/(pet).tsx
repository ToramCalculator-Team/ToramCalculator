import { defaultPlayerPet, PlayerPet } from "~/repositories/playerPet";
import { createEffect, createMemo, createSignal, JSX, onMount } from "solid-js";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";

export default function PlayerPetIndexPage() {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));

  onMount(() => {
    console.log("--PlayerPetIndexPage Render");
    
    return () => {
      console.log("--PlayerPetIndexPage Unmount");
    };
  });

  return (
    <>
      <div class="Content flex flex-col gap-4 p-3">
        <a href="/PlayerPet/defaultPlayerPetId">defaultPlayerPetId</a>
      </div>
    </>
  );
}
