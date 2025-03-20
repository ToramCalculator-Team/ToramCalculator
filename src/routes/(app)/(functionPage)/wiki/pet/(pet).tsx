import { defaultPlayerPet, PlayerPet } from "~/repositories/customPet";
import { createEffect, createMemo, createSignal, JSX, onMount } from "solid-js";
import { getDictionary } from "~/locales/i18n";
import { setStore, store } from "~/store";

export default function PlayerPetIndexPage() {
  // UI文本字典
  const dictionary = createMemo(() => getDictionary(store.settings.language));

  // 状态管理参数
  const PlayerPetList = store.wiki.petPage.petList;
  const setPlayerPetList = (value: PlayerPet[]) => setStore("wiki","petPage","petList", value);
  const PlayerPet = defaultPlayerPet;
  const setPlayerPet = (value: PlayerPet) => setStore("wiki","petPage", "petId", value.id);

  const [computeResult, setComputeResult] = createSignal<JSX.Element | null>(null);
  const [dialogMeberIndex, setDialogMeberIndex] = createSignal<number>(0);

  onMount(() => {
    console.log("--PlayerPetIndexPage Render");
    setPlayerPetList([defaultPlayerPet, defaultPlayerPet]);
    setPlayerPet(defaultPlayerPet);

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
